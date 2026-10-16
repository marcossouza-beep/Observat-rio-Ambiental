/**
 * Conector da Assembleia Legislativa do Pará (fonte casa-pa). Em cada rodada:
 *   1. lista as 10 proposições mais novas de cada tipo que interessa (PL, PLC, PEC, PDL) e a busca por "ambiental";
 *   2. novas: entram as que passam na nota de relevância (até o teto por rodada);
 *   3. acompanhadas (pela chave ou pelo número no estado, "PA:PL 647/2026"), estejam ou não na lista: lê a página
 *      de detalhes, com andamentos, relatores, pareceres, votação no plenário e a lei, quando sai.
 * Se a página de detalhes falhar, a proposta entra só com o cartão da lista (apresentação).
 */
import { identificacaoDe, type Conector, type ResultadoColeta } from '../conector'
import type { PacoteProposicao } from '../tipos'
import { lerDetalhesAlepa, pacoteDosDetalhes } from './detalhes'
import { ALEPA, lerPainel, NAVEGADOR, pacoteAlepa, pedidoPainel, postarNaRede, TIPOS_ALEPA, type CartaoAlepa, type Postar } from './proposicoes'

export type ObterHtml = (url: string) => Promise<string>
const obterNaRede: ObterHtml = async (url) => {
  const r = await fetch(url, { headers: { 'User-Agent': NAVEGADOR }, signal: AbortSignal.timeout(45_000) })
  if (!r.ok) throw new Error(`HTTP ${r.status} em ${url}`)
  return r.text()
}

/** Teto de páginas de detalhes por rodada (protege o site da Alepa e o tempo da coleta). */
const MAX_DETALHES = 40
const urlDetalhes = (id: number) => `${ALEPA}/Legislativo/DetalhesProposicao?IdProposicao=${id}`

export function criarConectorAlepa(opcoes: { postar?: Postar; obter?: ObterHtml } = {}): Conector {
  const postar = opcoes.postar || postarNaRede
  const obter = opcoes.obter || obterNaRede
  return {
    slug: 'casa-pa',
    nome: 'Assembleia Legislativa do Pará (pesquisa de proposições)',
    uf: 'PA',
    async coletar(ctx): Promise<ResultadoColeta> {
      const avisos: string[] = []
      const ano = ctx.agora.getUTCFullYear()
      const painel = `${ALEPA}/Legislativo/CallbackPanelProposicoes`
      const vistos = new Map<number, CartaoAlepa>()
      const totais: Record<string, number> = {}
      for (const t of TIPOS_ALEPA) {
        const r = lerPainel(await postar(painel, pedidoPainel(ano, { tipo: t.codigo })))
        totais[t.sigla] = r.total
        for (const c of r.cartoes) vistos.set(c.id, c)
      }
      const amb = lerPainel(await postar(painel, pedidoPainel(ano, { texto: 'ambiental' })))
      totais.ambiental = amb.total
      for (const c of amb.cartoes) vistos.set(c.id, c)

      // Quem vai ter a página de detalhes lida: novas relevantes e todas as acompanhadas
      const escolhidas = new Map<number, CartaoAlepa | null>()
      let novas = 0
      for (const c of vistos.values()) {
        const chave = `alepa:proposicao:${c.id}`
        if (ctx.descartadas.has(chave)) continue
        const acompanhada = ctx.acompanhadas.has(chave) || ctx.acompanhadas.has(`PA:${identificacaoDe(c.sigla, c.numero, c.ano)}`)
        if (!acompanhada) {
          if (novas >= ctx.maxNovas || ctx.relevancia(c.ementa) < ctx.notaMinima) continue
          novas++
        }
        escolhidas.set(c.id, c)
      }
      // Acompanhadas fora da lista: pela chave da Alepa ou, se cadastradas à mão, pelo número (busca no painel)
      for (const k of ctx.acompanhadas) {
        const porChave = /^alepa:proposicao:(\d+)$/.exec(k)
        if (porChave) {
          if (!escolhidas.has(Number(porChave[1]))) escolhidas.set(Number(porChave[1]), null)
          continue
        }
        const porNumero = /^PA:([A-Z]+) (\d+)\/(\d{4})$/.exec(k)
        const tipo = porNumero && TIPOS_ALEPA.find((t) => t.sigla === porNumero[1])
        if (!porNumero || !tipo) continue
        const ja = [...escolhidas.values()].some((c) => c && c.sigla === porNumero[1] && c.numero === Number(porNumero[2]) && c.ano === Number(porNumero[3]))
        if (ja) continue
        try {
          const achada = lerPainel(await postar(painel, { ...pedidoPainel(Number(porNumero[3]), { tipo: tipo.codigo }), 'model[Numero]': porNumero[2] })).cartoes.find((c) => c.numero === Number(porNumero[2]))
          if (achada) escolhidas.set(achada.id, achada)
        } catch (e) {
          avisos.push(`busca de ${k.slice(3)}: ${(e as Error).message}`.slice(0, 200))
        }
      }

      const pacotes: PacoteProposicao[] = []
      let lidas = 0
      for (const [id, cartao] of escolhidas) {
        if (lidas >= MAX_DETALHES) {
          if (cartao) pacotes.push(pacoteAlepa(cartao))
          continue
        }
        lidas++
        try {
          pacotes.push(pacoteDosDetalhes(id, lerDetalhesAlepa(await obter(urlDetalhes(id))), cartao?.ano || ano))
        } catch (e) {
          avisos.push(`detalhes de ${cartao ? `${cartao.sigla} ${cartao.numero}/${cartao.ano}` : id}: ${(e as Error).message}`.slice(0, 200))
          if (cartao) pacotes.push(pacoteAlepa(cartao))
        }
      }
      if (escolhidas.size > MAX_DETALHES) avisos.push(`${escolhidas.size - MAX_DETALHES} propostas sem detalhes nesta rodada (limite de ${MAX_DETALHES})`)
      if (novas >= ctx.maxNovas) avisos.push(`limite de ${ctx.maxNovas} propostas novas por rodada atingido; o restante entra nas próximas`)
      return { pacotes, pautas: [], itensListados: vistos.size, amostra: { ano, totais, listadas: vistos.size, detalhes: lidas }, avisos }
    },
  }
}

export const conectorAlepa = criarConectorAlepa()
