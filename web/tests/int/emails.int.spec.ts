import { getPayload, type Payload } from 'payload'
import { SECOES_PARECER } from '@/lib/publicacao'
import config from '@/payload.config'
import { beforeAll, describe, expect, it } from 'vitest'
import { enviarFila, processarComunicados } from '@/tarefas'

let payload: Payload
const agora = () => new Date().toISOString()
const para = (t: string) => ({ type: 'paragraph', format: '', indent: 0, version: 1, direction: 'ltr', textFormat: 0, children: [{ type: 'text', text: t, format: 0, detail: 0, mode: 'normal', style: '', version: 1 }] })
const rich = (t: string) => ({ root: { type: 'root', format: '', indent: 0, version: 1, direction: 'ltr', children: [para(t)] } })
const secoes = Object.fromEntries(SECOES_PARECER.map((s) => s.nome).map((k) => [k, rich(`Seção ${k} com texto suficiente para contar.`)]))

beforeAll(async () => {
  payload = await getPayload({ config: await config })
  for (const c of ['envios', 'comunicados', 'pareceres', 'compromissos', 'assinantes', 'proposicoes'] as const) await payload.delete({ collection: c, where: { id: { exists: true } } })
})

const pessoa = (email: string, extra: Record<string, unknown> = {}) =>
  payload.create({ collection: 'assinantes', data: { email, consentimentoEm: agora(), confirmadoEm: agora(), aceitaEmails: true, ...extra } as never })

describe('e-mails', () => {
  it('publicar avisa quem pediu e quem segue, só confirmados que aceitam e-mail; quem pediu sai da lista', async () => {
    const prop = await payload.create({ collection: 'proposicoes', data: { sigla: 'PL', numero: 7001, ano: 2026, esfera: 'federal', situacaoEditorial: 'ativa', titulo: 'Teste' } as never })
    const a = await pessoa('pediu@exemplo.com', { avisarParecer: [prop.id] })
    await pessoa('segue@exemplo.com', { seguindo: [prop.id] })
    await pessoa('naoconfirmou@exemplo.com', { avisarParecer: [prop.id], confirmadoEm: null })
    await pessoa('descadastrou@exemplo.com', { avisarParecer: [prop.id], aceitaEmails: false })
    await payload.create({ collection: 'pareceres', data: { proposicao: prop.id, status: 'publicado', impacto: 'alto', carater: 'benefico', secoes } as never })
    const env = await payload.find({ collection: 'envios', where: { tipo: { equals: 'aviso_publicacao' } } })
    expect(env.docs.map((e) => e.para).sort()).toEqual(['pediu@exemplo.com', 'segue@exemplo.com'])
    expect(env.docs[0].html).toContain('/api/descadastrar?t=')
    const depois = await payload.findByID({ collection: 'assinantes', id: a.id })
    expect(depois.avisarParecer).toEqual([])
  })

  it('comunicado filtra por perfil, subgrupo e estado', async () => {
    await pessoa('adv-to@exemplo.com', { perfil: 'Advogado(a)', subperfil: 'Advocacia pública', uf: 'TO' })
    await pessoa('adv-pa@exemplo.com', { perfil: 'Advogado(a)', subperfil: 'Advocacia pública', uf: 'PA' })
    await pessoa('est-to@exemplo.com', { perfil: 'Estudante', curso: 'Direito', uf: 'TO' })
    await payload.create({ collection: 'comunicados', data: { assunto: 'Convite', mensagem: 'Olá {nome}, convite.', perfis: ['Advogado(a)', 'Estudante'], subperfis: ['Advocacia pública', 'Direito'], uf: 'TO', status: 'agendado' } as never })
    const r = await processarComunicados(payload)
    expect(r.comunicados).toEqual([expect.objectContaining({ pessoas: 2 })])
    const env = await payload.find({ collection: 'envios', where: { tipo: { equals: 'comunicado' } } })
    expect(env.docs.map((e) => e.para).sort()).toEqual(['adv-to@exemplo.com', 'est-to@exemplo.com'])
  })

  it('a fila envia e marca como enviado', async () => {
    const r = await enviarFila(payload)
    expect(r.falhas).toBe(0)
    const ainda = await payload.count({ collection: 'envios', where: { status: { equals: 'fila' } } })
    expect(ainda.totalDocs).toBe(0)
  })

  it('resposta a pedido vai por e-mail; pedido já resolvido não abre prazo', async () => {
    const ped = await payload.create({ collection: 'pedidos', data: { tipo: 'correcao', email: 'leitor@exemplo.com', texto: 'Data errada no parecer.' } })
    await payload.update({ collection: 'pedidos', id: ped.id, data: { decisao: 'nao_procede', resposta: 'Conferimos e a data está correta.' } })
    const env = await payload.find({ collection: 'envios', where: { para: { equals: 'leitor@exemplo.com' } } })
    expect(env.docs[0].assunto).toMatch(/correção/)
    const lgpd = await payload.create({ collection: 'pedidos', data: { tipo: 'lgpd', email: 'excluido@anonimo.invalid', texto: 'Exclusão feita pela pessoa.', decisao: 'atendido' } })
    const c = await payload.find({ collection: 'compromissos', where: { alvo: { equals: 'pedidos' }, alvoId: { equals: String(lgpd.id) } } })
    expect(c.totalDocs).toBe(0)
  })
})
