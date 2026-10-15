/**
 * Texto integral das versões: baixa o arquivo oficial (PDF), extrai o texto e guarda na versão.
 * Com o texto, o dossiê marca o que mudou entre versões e mostra o Art. 1º; a nota de relevância usa o Art. 1º.
 * PDF escaneado (sem camada de texto) fica marcado; OCR é um passo futuro (docs/APIS.md, seção 5).
 */
import { createHash } from 'node:crypto'
import type { Payload } from 'payload'
import { obter, type OpcoesHttp } from './http'

const MAX_ARQUIVO = 25 * 1024 * 1024
const MAX_TEXTO = 400_000

/** Começo de um dispositivo: aí a quebra de linha é de verdade; no resto, é só o fim da linha do PDF. */
const DISPOSITIVO = /^(Art\.|§|Par[áa]grafo [úu]nico|CAP[ÍI]TULO|Cap[íi]tulo|T[ÍI]TULO|SE[ÇC][ÃA]O|Se[çc][ãa]o|Subse[çc][ãa]o|[IVXLC]+\s*[-–—]|[a-z]\)|\d+\.\s|JUSTIFICA[ÇC][ÃA]O|Sala d|O CONGRESSO NACIONAL|O PRESIDENTE)/

export function limparTexto(bruto: string): string {
  const linhas = bruto
    .replace(/\r/g, '')
    .replace(/(\w)-\n(\w)/g, '$1$2') // palavra quebrada no fim da linha
    .split('\n')
    .map((l) => l.replace(/[ \t ]+/g, ' ').trim())
    .filter(Boolean)
  const saida: string[] = []
  for (const l of linhas) {
    if (!saida.length || DISPOSITIVO.test(l) || /[.:;]$/.test(saida[saida.length - 1]) && /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ]/.test(l)) saida.push(l)
    else saida[saida.length - 1] += ` ${l}`
  }
  return saida.join('\n')
}

/** Art. 1º do texto da proposta (até o Art. 2º ou o fim do parágrafo). */
export function artigoPrimeiro(texto: string | null | undefined): string | undefined {
  if (!texto) return undefined
  const m = /(^|\n)(Art\.\s*1[º°o]?\.?\s[^\n]+(?:\n(?!Art\.\s*2)[^\n]+){0,8})/.exec(texto)
  return m ? m[2].trim().slice(0, 3000) : undefined
}

export async function extrairTextoPdf(arquivo: Uint8Array): Promise<{ texto: string; paginas: number }> {
  const { extractText, getDocumentProxy } = await import('unpdf')
  const pdf = await getDocumentProxy(new Uint8Array(arquivo))
  const { totalPages, text } = await extractText(pdf, { mergePages: true })
  return { texto: limparTexto(text), paginas: totalPages }
}

export type Baixador = (url: string) => Promise<Buffer>
export const baixarArquivo =
  (o: OpcoesHttp = {}): Baixador =>
  async (url) => {
    const r = await obter(url, { tentativas: 2, tempoLimiteMs: 90_000, ...o })
    const tamanho = Number(r.headers.get('content-length') || 0)
    if (tamanho > MAX_ARQUIVO) throw new Error(`arquivo grande demais (${Math.round(tamanho / 1048576)} MB)`)
    return Buffer.from(await r.arrayBuffer())
  }

/** Preenche o texto das versões mais recentes que ainda não têm (algumas por rodada, para não pesar na fonte). */
export async function preencherTextos(payload: Payload, opcoes: { limite?: number; baixar?: Baixador } = {}) {
  const baixar = opcoes.baixar || baixarArquivo()
  const pendentes = await payload.find({
    collection: 'versoes',
    where: {
      and: [
        { url: { exists: true } },
        { or: [{ texto: { exists: false } }, { texto: { equals: '' } }] },
        { or: [{ tentativasTexto: { exists: false } }, { tentativasTexto: { less_than: 3 } }] },
      ],
    },
    sort: '-data',
    limit: opcoes.limite ?? 8,
    depth: 0,
  })
  const r = { lidos: 0, escaneados: 0, falhas: 0 }
  for (const v of pendentes.docs) {
    const tentativas = (v.tentativasTexto || 0) + 1
    try {
      const arquivo = await baixar(v.url!)
      if (arquivo.subarray(0, 5).toString() !== '%PDF-') {
        await payload.update({ collection: 'versoes', id: v.id, context: { semRevalidar: true }, data: { tentativasTexto: 3, semTextoMotivo: 'O arquivo oficial não é PDF; abra pelo link' } })
        r.falhas++
        continue
      }
      const { texto, paginas } = await extrairTextoPdf(arquivo)
      const hash = createHash('sha256').update(arquivo).digest('hex').slice(0, 32)
      if (texto.replace(/\s/g, '').length < 150 * Math.max(1, Math.min(paginas, 4))) {
        await payload.update({ collection: 'versoes', id: v.id, context: { semRevalidar: true }, data: { tentativasTexto: 3, hash, semTextoMotivo: 'PDF escaneado, sem texto pesquisável (leitura por OCR fica para depois)' } })
        r.escaneados++
        continue
      }
      await payload.update({ collection: 'versoes', id: v.id, context: { semRevalidar: true }, data: { texto: texto.slice(0, MAX_TEXTO), hash, tentativasTexto: tentativas, semTextoMotivo: null } })
      // A proposta ganha o Art. 1º, se ainda não tem (melhora a nota de relevância e o dossiê)
      const propId = typeof v.proposicao === 'object' ? v.proposicao.id : v.proposicao
      const art1 = artigoPrimeiro(texto)
      if (art1) {
        const prop = await payload.findByID({ collection: 'proposicoes', id: propId, depth: 0 })
        if (!prop.art1) await payload.update({ collection: 'proposicoes', id: propId, context: { semRevalidar: true }, data: { art1 } })
      }
      r.lidos++
    } catch (e) {
      await payload.update({ collection: 'versoes', id: v.id, context: { semRevalidar: true }, data: { tentativasTexto: tentativas, semTextoMotivo: `Falha ao ler: ${(e as Error).message}`.slice(0, 200) } })
      r.falhas++
    }
  }
  return r
}
