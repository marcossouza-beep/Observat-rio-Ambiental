/**
 * Alerta diário e resumo semanal (Fase 3): quem recebe, o que entra, o que não entra.
 */
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { beforeAll, describe, expect, it } from 'vitest'
import { alertasDiarios, resumoSemanal } from '@/tarefas/automaticos'

let payload: Payload
const para = (t: string) => ({ type: 'paragraph', format: '', indent: 0, version: 1, direction: 'ltr', textFormat: 0, children: [{ type: 'text', text: t, format: 0, detail: 0, mode: 'normal', style: '', version: 1 }] })
const rich = (t: string) => ({ root: { type: 'root', format: '', indent: 0, version: 1, direction: 'ltr', children: [para(t)] } })
const secoes = Object.fromEntries(['resumo', 'oQueMuda', 'impactos', 'pontosAtencao', 'baseLegal', 'recomendacoes', 'conclusao'].map((k) => [k, rich(`Seção ${k} com texto suficiente para contar.`)]))

const AGORA = new Date()
const horas = (n: number) => new Date(AGORA.getTime() + n * 36e5).toISOString()
let publica: number
let triagem: number
let fulano: number

const envios = async (tipo: string) => (await payload.find({ collection: 'envios', where: { tipo: { equals: tipo } }, limit: 50 })).docs

beforeAll(async () => {
  payload = await getPayload({ config: await config })
  for (const c of ['envios', 'alertas', 'votos', 'votacoes', 'tramitacoes', 'versoes', 'pareceres', 'compromissos', 'assinantes', 'proposicoes', 'parlamentares'] as const)
    await payload.delete({ collection: c, where: { id: { exists: true } } })
  await payload.updateGlobal({ slug: 'emails-automaticos', data: { resumo: { nota: '', pular: false, ultimoEnvio: null }, alertas: { ultimoEnvio: null } } })

  publica = (await payload.create({ collection: 'proposicoes', data: { esfera: 'federal', sigla: 'PL', numero: 8001, ano: 2026, titulo: 'Licenciamento de mineração', situacaoEditorial: 'monitorada' } })).id
  triagem = (await payload.create({ collection: 'proposicoes', data: { esfera: 'federal', sigla: 'PL', numero: 8002, ano: 2026, titulo: 'Proposta ainda na triagem', situacaoEditorial: 'triagem' } })).id
  fulano = (await payload.create({ collection: 'parlamentares', data: { nome: 'Fulano de Tal', partido: 'PV', uf: 'TO', casa: 'camara', chaveOrigem: 'camara:deputado:1' } })).id

  const base = { aceitaEmails: true, consentimentoEm: AGORA.toISOString(), confirmadoEm: AGORA.toISOString() }
  await payload.create({ collection: 'assinantes', data: { ...base, email: 'segue@exemplo.com', nome: 'Ana Souza', alertas: true, resumoSemanal: true, seguindo: [publica, triagem], seguirParlamentares: [fulano] } })
  await payload.create({ collection: 'assinantes', data: { ...base, email: 'sem-alerta@exemplo.com', alertas: false, resumoSemanal: false, seguindo: [publica] } })
  await payload.create({ collection: 'assinantes', data: { ...base, email: 'nao-confirmado@exemplo.com', confirmadoEm: undefined, alertas: true, resumoSemanal: true, seguindo: [publica] } })

  await payload.create({ collection: 'tramitacoes', data: { proposicao: publica, data: horas(-5), orgao: 'PLEN', descricao: 'Votação (Plenário): Aprovado o projeto', tipoEvento: 'votacao' } })
  await payload.create({ collection: 'tramitacoes', data: { proposicao: publica, data: horas(48), orgao: 'CMADS', descricao: 'Na pauta da CMADS (Reunião Deliberativa)', tipoEvento: 'pauta' } })
  await payload.create({ collection: 'tramitacoes', data: { proposicao: publica, data: horas(-6), orgao: 'CMADS', descricao: 'Recebimento pela CMADS', tipoEvento: 'outro' } })
  await payload.create({ collection: 'tramitacoes', data: { proposicao: triagem, data: horas(-5), orgao: 'PLEN', descricao: 'Votação da proposta na triagem', tipoEvento: 'votacao' } })
})

describe('alerta diário', () => {
  it('só para quem segue e pediu o alerta; só propostas públicas e eventos relevantes', async () => {
    const r = await alertasDiarios(payload, AGORA)
    expect(r).toMatchObject({ leis: 1, pessoas: 1 })
    const [e] = await envios('alerta')
    expect(e.para).toBe('segue@exemplo.com')
    expect(e.assunto).toBe('Novidade: PL nº 8.001/2026')
    expect(e.texto).toContain('Votação: Aprovado o projeto')
    expect(e.texto).toContain('Entrou na pauta')
    expect(e.texto).not.toContain('Recebimento')
    expect(e.texto).not.toContain('triagem')
    expect(e.texto).toContain('/conta')
  })

  it('no máximo um por dia', async () => {
    expect(await alertasDiarios(payload, new Date(AGORA.getTime() + 2 * 36e5))).toEqual({ ignorado: 'já enviado nas últimas 12 horas' })
  })
})

describe('resumo semanal', () => {
  it('nota do autor, parecer da semana, pauta e voto do parlamentar seguido', async () => {
    await payload.create({ collection: 'pareceres', data: { proposicao: publica, titulo: 'Parecer sobre o licenciamento de mineração', status: 'publicado', impacto: 'alto', carater: 'malefico', secoes } })
    const v = await payload.create({ collection: 'votacoes', data: { proposicao: publica, data: horas(-5), orgao: 'PLEN', placarSim: 300, placarNao: 100 } })
    await payload.create({ collection: 'votos', data: { votacao: v.id, parlamentar: fulano, voto: 'nao' } })
    await payload.updateGlobal({ slug: 'emails-automaticos', data: { resumo: { nota: 'Semana decisiva para o licenciamento.' } } })

    const r = await resumoSemanal(payload, AGORA)
    expect(r).toMatchObject({ pareceres: 1, pessoas: 1, votos: 1 })
    const [e] = await envios('resumo')
    expect(e.para).toBe('segue@exemplo.com')
    expect(e.texto).toMatch(/^Resumo da semana/)
    expect(e.texto).toContain('Semana decisiva para o licenciamento.')
    expect(e.texto).toContain('PARECERES PUBLICADOS')
    expect(e.texto).toContain('EM VOTAÇÃO NOS PRÓXIMOS DIAS')
    expect(e.texto).toContain('Fulano de Tal (PV-TO) votou Não')
    expect(e.texto).toContain('voto a favor da proteção')

    // A nota some depois do envio; não sai de novo na mesma semana
    const g = await payload.findGlobal({ slug: 'emails-automaticos' })
    expect(g.resumo?.nota).toBeFalsy()
    expect(await resumoSemanal(payload, new Date(AGORA.getTime() + 36e5))).toEqual({ ignorado: 'resumo já enviado nesta semana' })
  })

  it('o autor pode pular uma semana', async () => {
    await payload.updateGlobal({ slug: 'emails-automaticos', data: { resumo: { pular: true, ultimoEnvio: null } } })
    expect(await resumoSemanal(payload, AGORA)).toEqual({ ignorado: 'o autor pediu para não enviar esta semana' })
    expect((await payload.findGlobal({ slug: 'emails-automaticos' })).resumo?.pular).toBe(false)
  })
})
