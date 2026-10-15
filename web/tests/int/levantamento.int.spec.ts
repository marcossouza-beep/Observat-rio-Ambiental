/**
 * Fase 4/5: as fontes estaduais do levantamento entram no painel com nível e motivo; as que têm conector pronto já ligadas.
 */
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { beforeAll, describe, expect, it } from 'vitest'
import { registrarFontesEstaduais } from '@/levantamento/fontes'
import type { Resultado } from '@/levantamento/sondar'

let payload: Payload
const sinais = { json: true, xml: false, sapl: true, citaSapl: false, registros: 14533, pdfs: 0, linksProposicao: 0, linksDados: [], citaDadosAbertos: false, spa: false, bloqueio: false, texto: 0 }
const resultado = (geradoEm: string, statusDiario: number | null): Resultado => ({
  geradoEm,
  ambiente: 'teste',
  orgaos: [
    { uf: 'TO', orgao: 'casa', nome: 'Assembleia Legislativa do Tocantins', sigla: 'Aleto', sondagens: [{ url: 'https://sapl.al.to.leg.br/api/materia/materialegislativa/?page_size=1', papel: 'sapl_padrao', status: 200, bytes: 900, sinais }] },
    { uf: 'TO', orgao: 'diario', nome: 'Diário Oficial do Tocantins', sigla: 'DOE-TO', sondagens: [{ url: 'https://diariooficial.to.gov.br/', papel: 'diario', status: statusDiario, erro: statusDiario ? undefined : 'UND_ERR_CONNECT_TIMEOUT' }] },
  ],
})

beforeAll(async () => {
  payload = await getPayload({ config: await config })
  await payload.delete({ collection: 'fontes', where: { slug: { in: ['casa-to', 'doe-to'] } } })
})

describe('fontes estaduais do levantamento', () => {
  it('cria com nível, endereço e motivo; com conector pronto já liga; nível D sem conector fica manual', async () => {
    expect(await registrarFontesEstaduais(payload, resultado('2026-10-15T19:00:00.000Z', null))).toEqual({ criadas: 2, atualizadas: 0 })
    const casa = (await payload.find({ collection: 'fontes', where: { slug: { equals: 'casa-to' } } })).docs[0]
    expect(casa).toMatchObject({ nivel: 'A', esfera: 'estadual', uf: 'TO', ativa: true, conector: 'casa-to', manual: false, url: 'https://sapl.al.to.leg.br/api/materia/materialegislativa/?page_size=1' })
    expect(casa.levantamento?.motivo).toBe('API do SAPL respondendo (14533 matérias)')
    const doe = (await payload.find({ collection: 'fontes', where: { slug: { equals: 'doe-to' } } })).docs[0]
    expect(doe).toMatchObject({ nivel: 'D', manual: true, ativa: false })
  })

  it('nova sondagem atualiza nível e registro, sem religar nem mexer no que o autor ajustou', async () => {
    const doe = (await payload.find({ collection: 'fontes', where: { slug: { equals: 'doe-to' } } })).docs[0]
    await payload.update({ collection: 'fontes', id: doe.id, data: { conector: 'doe-to' } })
    const r = resultado('2026-10-20T19:00:00.000Z', 200)
    r.orgaos[1].sondagens[0].sinais = { ...sinais, json: false, sapl: false, registros: undefined, pdfs: 8, texto: 3000 }
    expect(await registrarFontesEstaduais(payload, r)).toEqual({ criadas: 0, atualizadas: 2 })
    const depois = await payload.findByID({ collection: 'fontes', id: doe.id })
    expect(depois).toMatchObject({ nivel: 'C', ativa: false, conector: 'doe-to', manual: true })
    expect(depois.levantamento?.verificadoEm).toBe('2026-10-20T19:00:00.000Z')
  })

  it('casa com conector que o autor desligou não é religada por nova sondagem', async () => {
    const casa = (await payload.find({ collection: 'fontes', where: { slug: { equals: 'casa-to' } } })).docs[0]
    await payload.update({ collection: 'fontes', id: casa.id, data: { ativa: false } })
    await registrarFontesEstaduais(payload, resultado('2026-10-21T19:00:00.000Z', 200))
    expect((await payload.findByID({ collection: 'fontes', id: casa.id })).ativa).toBe(false)
  })
})
