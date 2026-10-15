/**
 * Fase 5 (Norte): rodada completa do conector do SAPL de Tocantins, sobre respostas reais gravadas.
 * Proposta acompanhada ganha tramitação, situação e autoria; proposta nova só entra pela palavra-chave do estado.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { beforeAll, describe, expect, it } from 'vitest'
import { coletarFonte } from '@/coleta/executar'

let payload: Payload
const dir = path.resolve(__dirname, '../fixtures/coleta/sapl')
const corpo = (f: string) => JSON.parse(readFileSync(path.join(dir, `${f}.json`), 'utf8')).corpo
const pagina = (results: unknown[]) => ({ pagination: { next_page: null, total_entries: results.length }, results })
const AGORA = new Date('2026-10-15T15:00:00.000Z')

// Matéria nova (real, com a ementa trocada) para testar a palavra-chave regional
const materias = corpo('to-materias').results as Record<string, unknown>[]
const nova = { ...materias.find((m) => m.id === 13714), id: 99001, numero: 77, tipo: 1, ementa: 'Cria o Mosaico de Áreas Protegidas do Jalapão e dá outras providências.' }

function buscar(url: string): Promise<unknown> {
  const u = new URL(url)
  const p = u.pathname
  const materia = u.searchParams.get('materia')
  let r: unknown
  if (p.endsWith('/tipomaterialegislativa/')) r = corpo('to-tipos')
  else if (p.endsWith('/statustramitacao/')) r = corpo('to-status')
  else if (p.endsWith('/unidadetramitacao/')) r = corpo('to-unidades')
  else if (p.endsWith('/materialegislativa/')) r = pagina([...materias, nova])
  else if (p.endsWith('/tramitacao/')) r = materia === '13716' ? corpo('to-tramitacao-0') : pagina([])
  else if (p.endsWith('/autoria/')) r = corpo('to-autoria-0')
  else if (/\/base\/autor\/184\/$/.test(p)) r = corpo('to-autor')
  else return Promise.reject(new Error(`sem amostra para ${url}`))
  return Promise.resolve(JSON.parse(JSON.stringify(r)))
}

beforeAll(async () => {
  payload = await getPayload({ config: await config })
  for (const c of ['tramitacoes', 'versoes', 'alertas', 'coletas'] as const) await payload.delete({ collection: c, where: { id: { exists: true } } })
  await payload.delete({ collection: 'proposicoes', where: { chaveOrigem: { like: 'sapl:to:' } } })
  await payload.delete({ collection: 'fontes', where: { slug: { equals: 'casa-to' } } })
  await payload.delete({ collection: 'palavras-chave', where: { termo: { equals: 'jalapão' } } })
  await payload.create({ collection: 'palavras-chave', data: { termo: 'jalapão', grupo: 'Unidades de conservação', peso: 10, uf: 'TO' } })
  await payload.updateGlobal({ slug: 'ajustes', data: { coleta: { notaMinima: 40, maxNovas: 5 } } })
  await payload.create({
    collection: 'proposicoes',
    data: { esfera: 'estadual', uf: 'TO', casa: 'assembleia', sigla: 'MP', numero: 1, ano: 2026, situacaoEditorial: 'monitorada', chaveOrigem: 'sapl:to:13716' },
  })
})

describe('conector do SAPL (Tocantins)', () => {
  it('atualiza a acompanhada e traz para a triagem só a nova com palavra-chave do estado', async () => {
    const r = await coletarFonte(payload, 'casa-to', { agora: AGORA, buscar })
    expect(r.ok).toBe(true)
    expect(r.balanco).toMatchObject({ novas: 1 })

    const mp = (await payload.find({ collection: 'proposicoes', where: { chaveOrigem: { equals: 'sapl:to:13716' } }, depth: 0 })).docs[0]
    expect(mp).toMatchObject({ esfera: 'estadual', uf: 'TO', statusOficial: 'Proposição aprovada', statusSimplificado: 'aprovada', situacaoEditorial: 'monitorada' })
    expect(mp.autoria?.[0]).toMatchObject({ papel: 'autor', nomeLivre: 'WANDERLEI BARBOSA CASTRO (Governador do Estado)' })
    expect((await payload.count({ collection: 'tramitacoes', where: { proposicao: { equals: mp.id } } })).totalDocs).toBe(5)

    const jalapao = (await payload.find({ collection: 'proposicoes', where: { chaveOrigem: { equals: 'sapl:to:99001' } }, depth: 0 })).docs[0]
    expect(jalapao).toMatchObject({ esfera: 'estadual', uf: 'TO', casa: 'assembleia', sigla: 'PLO', numero: 77, situacaoEditorial: 'triagem' })
    expect(jalapao.termosEncontrados).toContain('jalapão')
    // As outras MPs (IPVA etc.) não têm palavra-chave: não entram
    expect((await payload.count({ collection: 'proposicoes', where: { chaveOrigem: { like: 'sapl:to:' } } })).totalDocs).toBe(2)

    const fonte = (await payload.find({ collection: 'fontes', where: { slug: { equals: 'casa-to' } } })).docs[0]
    expect(fonte.ultimaColetaOk).toBe(AGORA.toISOString())
  })

  it('coletar de novo não duplica nada', async () => {
    const r = await coletarFonte(payload, 'casa-to', { agora: new Date(AGORA.getTime() + 36e5), buscar })
    expect(r.balanco).toMatchObject({ novas: 0, tramitacoes: 0 })
    expect((await payload.count({ collection: 'proposicoes', where: { chaveOrigem: { like: 'sapl:to:' } } })).totalDocs).toBe(2)
  })

  it('o PL 77/2026 de Tocantins não se confunde com um PL 77/2026 federal', async () => {
    const federal = await payload.create({ collection: 'proposicoes', data: { esfera: 'federal', sigla: 'PLO', numero: 77, ano: 2026, situacaoEditorial: 'triagem', chaveOrigem: 'camara:teste-77' } })
    await coletarFonte(payload, 'casa-to', { agora: new Date(AGORA.getTime() + 72e5), buscar })
    const doFederal = await payload.findByID({ collection: 'proposicoes', id: federal.id, depth: 0 })
    expect(doFederal.chavesExtras || []).not.toContain('sapl:to:99001')
    await payload.delete({ collection: 'proposicoes', id: federal.id })
  })
})
