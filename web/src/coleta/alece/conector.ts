/**
 * Conector da Assembleia Legislativa do Ceará (fonte casa-ce). Em cada rodada:
 *   1. lê o histórico do expediente e, de cada sessão desde a última coleta, a página com as matérias lidas;
 *   2. novas (projetos de lei, de lei complementar, PEC, decreto legislativo e mensagens do Executivo): entram as que
 *      passam na nota de relevância, até o teto por rodada, com o texto da ficha quando ela já existe;
 *   3. acompanhadas (pela chave ou pelo número no estado, "CE:PL 593/2026"): acha o registro na lista do www2, em
 *      ordem de número (busca binária nas páginas, tramitando e depois deliberados), com o histórico inteiro,
 *      comissões, local, autógrafo, lei e veto.
 */
import { dia, identificacaoDe, type Conector, type ResultadoColeta } from '../conector'
import { baixarArquivo, extrairTextoPdf, type Baixador } from '../textos'
import type { PacoteProposicao } from '../tipos'
import {
  ALECE,
  chaveCE,
  decodificarWww2,
  leiturasDoExpediente,
  pacoteDaLeitura,
  pacoteDoRegistro,
  paginasDaLista,
  registrosDaLista,
  sessoesDoHistorico,
  TABELAS_ALECE,
  urlFicha,
  urlLista,
  type RegistroAlece,
} from './mapear'

export type ObterPagina = (url: string) => Promise<string>
const NAVEGADOR =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'
const obterNaRede: ObterPagina = async (url) => {
  const r = await fetch(url, {
    headers: { 'User-Agent': NAVEGADOR, 'Accept-Language': 'pt-BR' },
    signal: AbortSignal.timeout(45_000),
  })
  if (!r.ok) throw new Error(`HTTP ${r.status} em ${url}`)
  // O www2 declara ISO-8859-1 com dados em UTF-8; o www é UTF-8
  return /www2\./.test(url) ? decodificarWww2(await r.arrayBuffer()) : r.text()
}

/** Tetos por rodada: sessões lidas e propostas acompanhadas procuradas no www2 (cada busca lê até ~8 páginas). */
const MAX_SESSOES = 12
const MAX_BUSCAS = 10

type Alvo = { sigla: string; numero: number; ano: number }

/** Propostas do Ceará acompanhadas, pela chave (alece:PL-593-2026) ou pela identificação no estado (CE:PL 593/2026). */
export function acompanhadasDoCeara(acompanhadas: Set<string>): Alvo[] {
  const r = new Map<string, Alvo>()
  for (const a of acompanhadas) {
    const m = /^alece:([A-Z]+)-(\d+)-(\d{4})$/.exec(a) || /^CE:([A-Z]+) (\d+)\/(\d{4})$/.exec(a)
    if (m && TABELAS_ALECE[m[1]])
      r.set(`${m[1]}-${Number(m[2])}-${m[3]}`, {
        sigla: m[1],
        numero: Number(m[2]),
        ano: Number(m[3]),
      })
  }
  return [...r.values()]
}

/** Busca binária do registro (número, ano) nas páginas da lista, que vem em ordem de número e depois de ano. */
export async function acharRegistro(
  pagina: (p: number) => Promise<string>,
  alvo: Alvo,
): Promise<RegistroAlece | null> {
  const primeira = await pagina(1)
  const cmp = (r: RegistroAlece) => r.numero - alvo.numero || r.ano - alvo.ano
  const inicio = registrosDaLista(primeira)
  if (!inicio.length) return null
  if (cmp(inicio[inicio.length - 1]) >= 0) return inicio.find((r) => cmp(r) === 0) || null
  let lo = 2
  let hi = paginasDaLista(primeira)
  while (lo <= hi) {
    const meio = Math.floor((lo + hi) / 2)
    const regs = registrosDaLista(meio === 1 ? primeira : await pagina(meio))
    if (!regs.length) return null
    if (cmp(regs[0]) > 0) hi = meio - 1
    else if (cmp(regs[regs.length - 1]) < 0) lo = meio + 1
    else return regs.find((r) => cmp(r) === 0) || null
  }
  return null
}

export function criarConectorAlece(
  opcoes: { obter?: ObterPagina; baixar?: Baixador } = {},
): Conector {
  const obter = opcoes.obter || obterNaRede
  const baixar = opcoes.baixar || baixarArquivo()
  return {
    slug: 'casa-ce',
    nome: 'Assembleia Legislativa do Ceará (expediente e proposições)',
    uf: 'CE',
    async coletar(ctx): Promise<ResultadoColeta> {
      const avisos: string[] = []
      const desde = dia(ctx.desde)
      const sessoes = sessoesDoHistorico(await obter(`${ALECE}/legislativo/expediente-historico`))
        .filter((s) => s.data >= desde)
        .sort((a, b) => a.data.localeCompare(b.data) || a.id - b.id)
      if (sessoes.length > MAX_SESSOES)
        avisos.push(`${sessoes.length} sessões no período; lidas as ${MAX_SESSOES} mais recentes`)

      const alvos = acompanhadasDoCeara(ctx.acompanhadas)
      const ehAcompanhada = (l: Alvo) =>
        ctx.acompanhadas.has(chaveCE(l.sigla, l.numero, l.ano)) ||
        ctx.acompanhadas.has(`CE:${identificacaoDe(l.sigla, l.numero, l.ano)}`)
      const pacotes = new Map<string, PacoteProposicao>()
      let novas = 0
      let lidas = 0
      for (const s of sessoes.slice(-MAX_SESSOES)) {
        let leituras
        try {
          leituras = leiturasDoExpediente(await obter(s.url))
        } catch (e) {
          avisos.push(`expediente de ${s.data}: ${(e as Error).message}`.slice(0, 200))
          continue
        }
        for (const l of leituras) {
          lidas++
          const chave = chaveCE(l.sigla, l.numero, l.ano)
          if (pacotes.has(chave) || ctx.descartadas.has(chave)) continue
          if (!ehAcompanhada(l)) {
            if (novas >= ctx.maxNovas || ctx.relevancia(l.ementa) < ctx.notaMinima) continue
            novas++
          }
          // Texto integral: a ficha em PDF costuma sair junto com a leitura; sem ela, a proposta entra com a ementa
          let texto: string | undefined
          const ficha = urlFicha(l.sigla, l.numero, l.ano)
          if (ficha?.endsWith('.pdf')) {
            try {
              texto = (await extrairTextoPdf(new Uint8Array(await baixar(ficha)))).texto.slice(
                0,
                15_000,
              )
            } catch {
              // ficha ainda não publicada
            }
          }
          pacotes.set(chave, pacoteDaLeitura(l, s, texto))
        }
      }
      if (novas >= ctx.maxNovas)
        avisos.push(
          `limite de ${ctx.maxNovas} propostas novas por rodada atingido; o restante entra nas próximas`,
        )

      // Acompanhadas: o registro do www2 traz o histórico completo (a leitura desta rodada, se houver, fica junto)
      const paginas = new Map<string, string>()
      const pagina = (sigla: string, opcao: 'T' | 'D') => async (p: number) => {
        const url = urlLista(sigla, opcao, p)
        if (!paginas.has(url)) paginas.set(url, await obter(url))
        return paginas.get(url)!
      }
      let achadas = 0
      if (alvos.length > MAX_BUSCAS)
        avisos.push(`${alvos.length} propostas acompanhadas; procuradas ${MAX_BUSCAS} nesta rodada`)
      for (const a of alvos.slice(0, MAX_BUSCAS)) {
        try {
          const r =
            (await acharRegistro(pagina(a.sigla, 'T'), a)) ||
            (await acharRegistro(pagina(a.sigla, 'D'), a))
          if (!r) continue
          achadas++
          const doRegistro = pacoteDoRegistro(r, a.sigla)
          const daLeitura = pacotes.get(doRegistro.proposicao.chave)
          if (daLeitura) {
            doRegistro.proposicao.ementa = daLeitura.proposicao.ementa
            doRegistro.tramitacoes.unshift(...daLeitura.tramitacoes)
            doRegistro.versoes = daLeitura.versoes
          }
          pacotes.set(doRegistro.proposicao.chave, doRegistro)
        } catch (e) {
          avisos.push(`${a.sigla} ${a.numero}/${a.ano}: ${(e as Error).message}`.slice(0, 200))
        }
      }

      return {
        pacotes: [...pacotes.values()],
        pautas: [],
        itensListados: sessoes.length,
        amostra: {
          sessoes: sessoes.map((s) => s.data),
          materiasLidas: lidas,
          acompanhadasAchadas: `${achadas}/${Math.min(alvos.length, MAX_BUSCAS)}`,
          paginasLidas: paginas.size,
          abertos: [...pacotes.keys()],
        },
        avisos,
      }
    },
  }
}

export const conectorAlece = criarConectorAlece()
