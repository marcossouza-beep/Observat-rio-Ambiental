import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { beforeAll, describe, expect, it } from 'vitest'
import { publicarAgendados, verificar } from '@/tarefas'

let payload: Payload

beforeAll(async () => {
  payload = await getPayload({ config: await config })
  for (const c of ['verificacoes', 'compromissos', 'pareceres', 'proposicoes', 'fontes'] as const)
    await payload.delete({ collection: c, where: { id: { exists: true } } })
})

describe('tarefas agendadas', () => {
  it('verificação aponta fonte atrasada e compromisso vencido', async () => {
    const agora = new Date()
    await payload.create({ collection: 'fontes', data: { nome: 'Senado', slug: 'senado-t', ultimaColetaOk: new Date(agora.getTime() - 12 * 36e5).toISOString() } })
    await payload.create({ collection: 'fontes', data: { nome: 'Câmara', slug: 'camara-t', ultimaColetaOk: new Date(agora.getTime() - 1 * 36e5).toISOString() } })
    await payload.create({
      collection: 'compromissos',
      data: { tipo: 'correcao', descricao: 'teste', alvo: 'pedidos', alvoId: '1', abertoEm: agora.toISOString(), prazoEm: new Date(agora.getTime() - 864e5).toISOString(), status: 'aberto' },
    })
    const r = await verificar(payload, agora)
    expect(r.fontesComProblema).toEqual([{ fonte: 'senado-t', situacao: 'atrasada' }])
    expect(r.compromissosVencidos).toBe(1)
    const v = await payload.find({ collection: 'verificacoes', where: { resultado: { equals: 'alerta' } } })
    expect(v.totalDocs).toBe(2)
  })

  it('publica agendados vencidos e respeita as travas', async () => {
    const prop = await payload.create({ collection: 'proposicoes', data: { sigla: 'PL', numero: 9001, ano: 2026, esfera: 'federal' } as never })
    const par = await payload.create({ collection: 'pareceres', data: { proposicao: prop.id, status: 'agendado', agendadoPara: new Date(Date.now() - 6e4).toISOString() } })
    const r = await publicarAgendados(payload)
    expect(r.publicados).toEqual([])
    expect((r.erros as string[])[0]).toMatch(/Ainda não dá para publicar/)
    const ainda = await payload.findByID({ collection: 'pareceres', id: par.id })
    expect(ainda.status).toBe('agendado')
  })
})
