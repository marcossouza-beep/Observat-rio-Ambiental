/**
 * Banco de Leis da Assembleia Legislativa do Pará (bancodeleis.alepa.pa.gov.br/api/leis.php, JSON aberto).
 * Traz só leis já aprovadas e publicadas, não os projetos em tramitação. Serve para:
 *   - registrar as leis estaduais novas de tema ambiental (entram na Triagem como norma);
 *   - dar ao autor o texto oficial da lei (PDF), que vira a versão "norma".
 * Cada chamada devolve até 50 leis, das mais novas para as mais antigas.
 * Chave: alepa:lei:<id>. Fonte: leis-pa.
 */
import type { Conector, ResultadoColeta } from '../conector'
import { ErroFormato, type PacoteProposicao } from '../tipos'

export const BANCO_DE_LEIS = 'https://bancodeleis.alepa.pa.gov.br/api/leis.php'

export type LeiAlepa = { id?: number | string; numero?: string | number; ano?: string | number; tipo?: string; ementa?: string; link_pdf?: string }

/** "Lei Ordinária" → Lei; "Lei Complementar" → LC; emendas e decretos legislativos com a sigla de costume. */
export function siglaDaLei(tipo = ''): string | null {
  const t = tipo.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  if (/complementar/.test(t)) return 'LC'
  if (/^lei/.test(t)) return 'Lei'
  if (/emenda/.test(t) && /estadua/.test(t)) return 'EC'
  if (/decreto legislativo/.test(t)) return 'DL'
  return null
}

/** Ementa sem o cabeçalho e as anotações de alteração que algumas leis antigas trazem ("LEI N° 5.887, DE… * Alterada…"). */
export function limparEmenta(e = ''): string {
  const t = e.replace(/\s+/g, ' ').trim()
  // "Dispõe sobre" tem prioridade: nas anotações aparecem "Alterada…", "Regulamentada…"
  const m = /Disp[õo]e sobre[^]*$/.exec(t) || /\b(Cria|Institui|Altera|Autoriza|Declara|Estabelece|Denomina|Reconhece|Concede|Define|Regulamenta|Fica)\b[^]*$/.exec(t)
  return (m ? m[0] : t).replace(/\s*DOE N[º°o.]*\s*[\d.]+,? de [\d/]+\.?\s*$/i, '').trim()
}

export function pacoteDaLei(l: LeiAlepa): PacoteProposicao | null {
  const id = Number(l.id)
  const numero = Number(String(l.numero ?? '').replace(/\D/g, ''))
  const ano = Number(l.ano)
  const sigla = siglaDaLei(l.tipo)
  if (!id) throw new ErroFormato('alepa-leis', 'id', 'leis.php')
  if (!sigla || !numero || !ano) return null
  const ementa = limparEmenta(l.ementa)
  const chave = `alepa:lei:${id}`
  // A API não traz a data; o nome do arquivo traz a data em que a lei entrou no banco (lei_20260805105738_…pdf)
  const d = /lei_(\d{4})(\d{2})(\d{2})\d*_/.exec(l.link_pdf || '')
  const data = d ? `${d[1]}-${d[2]}-${d[3]}` : undefined
  return {
    proposicao: {
      chave,
      casa: 'assembleia',
      esfera: 'estadual',
      uf: 'PA',
      sigla,
      numero,
      ano,
      ementa,
      statusOficial: `${l.tipo} publicada (Banco de Leis da Alepa)`,
      statusSimplificado: 'norma',
      ultimaMovimentacao: data,
      urlInteiroTeor: l.link_pdf,
      urlFonte: l.link_pdf || 'https://bancodeleis.alepa.pa.gov.br/',
      autoria: [],
    },
    tramitacoes: [],
    versoes: l.link_pdf && data ? [{ chave: `alepa:lei:${id}:texto`, proposicao: chave, data, tipo: 'norma', rotulo: `${sigla === 'Lei' ? 'Lei' : l.tipo} nº ${numero}/${ano} (texto oficial)`, url: l.link_pdf }] : [],
    votacoes: [],
  }
}

export const conectorLeisPara: Conector = {
  slug: 'leis-pa',
  nome: 'Banco de Leis da Assembleia Legislativa do Pará',
  uf: 'PA',
  async coletar(ctx): Promise<ResultadoColeta> {
    const anos = [...new Set([ctx.desde.getUTCFullYear(), ctx.agora.getUTCFullYear()])]
    const leis: LeiAlepa[] = []
    for (const ano of anos) {
      const r = (await ctx.buscar(`${BANCO_DE_LEIS}?ano=${ano}`)) as { status?: boolean; resultados?: LeiAlepa[] }
      if (r?.status === false) throw new ErroFormato('alepa-leis', 'status', `leis.php?ano=${ano}`)
      leis.push(...(r?.resultados || []))
    }
    const pacotes: PacoteProposicao[] = []
    let novas = 0
    for (const l of leis) {
      const chave = `alepa:lei:${l.id}`
      if (ctx.descartadas.has(chave)) continue
      if (!ctx.acompanhadas.has(chave)) {
        if (novas >= ctx.maxNovas || ctx.relevancia(limparEmenta(l.ementa)) < ctx.notaMinima) continue
        novas++
      }
      const p = pacoteDaLei(l)
      if (p) pacotes.push(p)
    }
    return { pacotes, pautas: [], itensListados: leis.length, amostra: { anos, leis: leis.length, primeira: leis[0] ?? null }, avisos: [] }
  },
}
