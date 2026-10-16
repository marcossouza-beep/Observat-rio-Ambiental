/**
 * Recalcular a Triagem com o dicionário atual: nota e termos refeitos (ex.: depois de uma palavra-chave nova).
 */
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { recalcularTriagem } from '@/endpoints'

let payload: Payload
const TERMO = 'pirarucu-teste'

beforeAll(async () => {
  payload = await getPayload({ config: await config })
  await payload.delete({ collection: 'palavras-chave', where: { termo: { equals: TERMO } } })
  await payload.delete({ collection: 'proposicoes', where: { chaveOrigem: { equals: 'teste:recalcular' } } })
})
afterAll(async () => {
  await payload.delete({ collection: 'palavras-chave', where: { termo: { equals: TERMO } } })
  await payload.delete({ collection: 'proposicoes', where: { chaveOrigem: { equals: 'teste:recalcular' } } })
})

describe('recalcular a Triagem', () => {
  it('palavra-chave nova passa a contar nas propostas que já estavam na Triagem', async () => {
    const p = await payload.create({
      collection: 'proposicoes',
      data: { sigla: 'PL', numero: 98765, ano: 2026, esfera: 'federal', ementa: 'Regula o manejo do pirarucu-teste em lagos de várzea.', situacaoEditorial: 'triagem', chaveOrigem: 'teste:recalcular' },
    })
    expect(p.termosEncontrados || []).not.toContain(TERMO)
    await payload.create({ collection: 'palavras-chave', data: { termo: TERMO, grupo: 'Fauna', peso: 10 } })
    const r = await recalcularTriagem(payload)
    expect(r.propostas).toBeGreaterThanOrEqual(1)
    const depois = await payload.findByID({ collection: 'proposicoes', id: p.id, depth: 0 })
    expect(depois.termosEncontrados).toContain(TERMO)
    expect(depois.relevancia).toBeGreaterThan(p.relevancia ?? 0)
  })
})
