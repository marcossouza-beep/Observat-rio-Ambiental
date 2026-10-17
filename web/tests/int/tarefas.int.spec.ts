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

  it('avisa a equipe por e-mail uma vez por dia enquanto a fonte estiver com problema, e zera quando volta', async () => {
    await payload.delete({ collection: 'envios', where: { tipo: { equals: 'aviso_equipe' } } })
    const email = 'equipe-aviso@teste.local'
    await payload.delete({ collection: 'users', where: { email: { equals: email } } })
    await payload.create({ collection: 'users', data: { email, password: 'senha-de-teste-123', papel: 'autor' } as never })
    const t0 = new Date()
    const f = await payload.create({ collection: 'fontes', data: { nome: 'Alesc', slug: 'casa-sc-t', esfera: 'estadual', toleranciaHoras: 4, ultimaColetaOk: new Date(t0.getTime() - 30 * 864e5).toISOString() } })
    const avisos = async () => (await payload.find({ collection: 'envios', where: { tipo: { equals: 'aviso_equipe' }, para: { equals: email } }, limit: 10 })).docs
    await verificar(payload, t0)
    const primeiro = await avisos()
    expect(primeiro).toHaveLength(1)
    expect(primeiro[0].assunto).toMatch(/fonte/i)
    expect(primeiro[0].texto).toMatch(/Alesc: sem coleta desde/)
    await verificar(payload, new Date(t0.getTime() + 36e5))
    expect(await avisos()).toHaveLength(1)
    await verificar(payload, new Date(t0.getTime() + 25 * 36e5))
    expect(await avisos()).toHaveLength(2)
    // A fonte volta: o aviso zera
    const volta = new Date(t0.getTime() + 26 * 36e5)
    await payload.update({ collection: 'fontes', id: f.id, data: { ultimaColetaOk: volta.toISOString() } })
    await verificar(payload, volta)
    expect((await payload.findByID({ collection: 'fontes', id: f.id })).alertaEnviadoEm).toBeFalsy()
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
