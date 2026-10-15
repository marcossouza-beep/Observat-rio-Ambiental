import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { chave, dataCivil, somarDias } from '@/lib/datas'

let payload: Payload

const para = (t: string) => ({
  type: 'paragraph', format: '', indent: 0, version: 1, direction: 'ltr', textFormat: 0,
  children: [{ type: 'text', text: t, format: 0, detail: 0, mode: 'normal', style: '', version: 1 }],
})
const rich = (t: string) => ({ root: { type: 'root', format: '', indent: 0, version: 1, direction: 'ltr', children: [para(t)] } })
const secoesCompletas = Object.fromEntries(
  ['resumo', 'oQueMuda', 'impactos', 'pontosAtencao', 'baseLegal', 'recomendacoes', 'conclusao'].map((k) => [k, rich(`Texto da seção ${k} com tamanho suficiente.`)]),
)

const LIMPAR = ['compromissos', 'correcoes', 'pedidos', 'credenciamentos', 'assinantes', 'pareceres', 'versoes', 'tramitacoes', 'proposicoes'] as const

async function limpar() {
  for (const c of LIMPAR) await payload.delete({ collection: c, where: { id: { exists: true } } })
}

async function compromissos(alvo: string, alvoId: string | number) {
  const r = await payload.find({ collection: 'compromissos', where: { alvo: { equals: alvo }, alvoId: { equals: String(alvoId) } }, depth: 0 })
  return r.docs
}

let seq = 100
const novaProposicao = (extra: Record<string, unknown> = {}) =>
  payload.create({
    collection: 'proposicoes',
    data: { sigla: 'PL', numero: seq++, ano: 2026, titulo: 'Regras de proteção do Pantanal', esfera: 'federal', casa: 'senado', ...extra } as never,
  })

beforeAll(async () => {
  payload = await getPayload({ config: await config })
  await limpar()
})
afterAll(async () => {
  await limpar()
})

describe('parecer prometido', () => {
  it('ativar abre compromisso de 7 dias e grava o prazo na proposição', async () => {
    const p = await novaProposicao()
    expect(p.rotulo).toMatch(/^PL nº \d+\/2026$/)
    expect(p.slug).toMatch(/^pl-\d+-2026-regras-de-protecao-do-pantanal$/)
    await payload.update({ collection: 'proposicoes', id: p.id, data: { situacaoEditorial: 'ativa' } })
    const [c] = await compromissos('proposicoes', p.id)
    expect(c.tipo).toBe('parecer_prometido')
    expect(c.status).toBe('aberto')
    expect(chave(dataCivil(new Date(c.prazoEm)))).toBe(chave(somarDias(dataCivil(new Date()), 7)))
    const atual = await payload.findByID({ collection: 'proposicoes', id: p.id })
    expect(atual.prazoParecer).toBe(c.prazoEm)
  })

  it('passar a só acompanhar retira a promessa', async () => {
    const p = await novaProposicao({ situacaoEditorial: 'ativa' })
    await payload.update({ collection: 'proposicoes', id: p.id, data: { situacaoEditorial: 'monitorada' } })
    const [c] = await compromissos('proposicoes', p.id)
    expect(c.status).toBe('retirado')
  })

  it('não duplica compromisso ao salvar de novo', async () => {
    const p = await novaProposicao({ situacaoEditorial: 'ativa' })
    await payload.update({ collection: 'proposicoes', id: p.id, data: { titulo: 'Outro título' } })
    expect(await compromissos('proposicoes', p.id)).toHaveLength(1)
  })
})

describe('publicação e desatualização', () => {
  it('trava publicação incompleta', async () => {
    const p = await novaProposicao()
    await expect(
      payload.create({ collection: 'pareceres', data: { proposicao: p.id, status: 'publicado' } }),
    ).rejects.toThrow(/Ainda não dá para publicar/)
  })

  it('publicar cumpre a promessa; texto novo marca desatualizado; nova versão resolve', async () => {
    const p = await novaProposicao({ situacaoEditorial: 'ativa' })
    const v1 = await payload.create({ collection: 'versoes', data: { proposicao: p.id, data: '2026-10-02T12:00:00.000Z', tipo: 'original', rotulo: 'Texto de 02/10' } })
    const par = await payload.create({
      collection: 'pareceres',
      data: { proposicao: p.id, status: 'publicado', impacto: 'alto', carater: 'benefico', versaoTexto: v1.id, secoes: secoesCompletas },
    })
    expect(par.publicadoEm).toBeTruthy()
    expect(par.slug).toBe(p.slug)
    expect((await compromissos('proposicoes', p.id))[0].status).toBe('cumprido')

    // Visitante vê o parecer publicado
    const visto = await payload.find({ collection: 'pareceres', overrideAccess: false, where: { id: { equals: par.id } } })
    expect(visto.docs).toHaveLength(1)

    // Chega um substitutivo
    const v2 = await payload.create({ collection: 'versoes', data: { proposicao: p.id, data: '2026-10-12T12:00:00.000Z', tipo: 'substitutivo', rotulo: 'Substitutivo de 12/10' } })
    const desat = await payload.findByID({ collection: 'pareceres', id: par.id })
    expect(desat.desatualizadoDesde).toBeTruthy()
    const [atualizacao] = await compromissos('pareceres', par.id)
    expect(atualizacao.tipo).toBe('atualizacao')
    expect(atualizacao.status).toBe('aberto')

    // Salvar outra coisa sem apontar a nova versão não tira a faixa
    const outra = await payload.update({ collection: 'pareceres', id: par.id, data: { seo: { tituloSeo: 'Novo título' } } })
    expect(outra.desatualizadoDesde).toBeTruthy()
    expect((await compromissos('pareceres', par.id))[0].status).toBe('aberto')

    // Autor aponta a nova versão: vira v2 e exige a nota do que mudou
    await expect(payload.update({ collection: 'pareceres', id: par.id, data: { versaoTexto: v2.id } })).rejects.toThrow(/o que mudou/)
    const pv2 = await payload.update({ collection: 'pareceres', id: par.id, data: { versaoTexto: v2.id, notaDaVersao: 'O substitutivo dobrou o limite.' } })
    expect(pv2.versao).toBe(2)
    expect(pv2.desatualizadoDesde).toBeNull()
    expect((await compromissos('pareceres', par.id))[0].status).toBe('cumprido')
  })

  it('visitante não vê rascunho', async () => {
    const p = await novaProposicao()
    const par = await payload.create({ collection: 'pareceres', data: { proposicao: p.id, status: 'rascunho' } })
    const r = await payload.find({ collection: 'pareceres', overrideAccess: false, where: { id: { equals: par.id } } })
    expect(r.docs).toHaveLength(0)
  })
})

describe('pedidos e credenciamento', () => {
  it('correção abre prazo de dias úteis e fecha com a decisão', async () => {
    const ped = await payload.create({ collection: 'pedidos', data: { tipo: 'correcao', email: 'leitor@exemplo.com', texto: 'O placar foi 21 a 12, não 21 a 11.' } })
    const [c] = await compromissos('pedidos', ped.id)
    expect(c.tipo).toBe('correcao')
    await payload.update({ collection: 'pedidos', id: ped.id, data: { decisao: 'procede', resposta: 'Corrigido.' } })
    const [c2] = await compromissos('pedidos', ped.id)
    expect(c2.status).toBe('cumprido')
  })

  it('credenciamento: pedir informação suspende; verificar cumpre', async () => {
    const a = await payload.create({ collection: 'assinantes', data: { email: 'ana@folha.exemplo', perfil: 'Jornalista', consentimentoEm: new Date().toISOString() } })
    const cr = await payload.create({ collection: 'credenciamentos', data: { assinante: a.id, veiculo: 'Folha do Norte', linkComprovacao: 'folha.exemplo/ana', autorizaVerificacao: true } })
    await payload.update({ collection: 'credenciamentos', id: cr.id, data: { status: 'mais_info' } })
    expect((await compromissos('credenciamentos', cr.id))[0].status).toBe('suspenso')
    await payload.update({ collection: 'credenciamentos', id: cr.id, data: { status: 'verificado' } })
    expect((await compromissos('credenciamentos', cr.id))[0].status).toBe('cumprido')
  })
})

describe('ajustes', () => {
  it('prazo do parecer segue o valor dos Ajustes', async () => {
    await payload.updateGlobal({ slug: 'ajustes', data: { prazos: { parecer: 10 } } })
    const p = await novaProposicao({ situacaoEditorial: 'ativa' })
    const [c] = await compromissos('proposicoes', p.id)
    expect(chave(dataCivil(new Date(c.prazoEm)))).toBe(chave(somarDias(dataCivil(new Date()), 10)))
    await payload.updateGlobal({ slug: 'ajustes', data: { prazos: { parecer: 7 } } })
  })
})

describe('o que o visitante vê', () => {
  it('proposição na triagem ou descartada não é pública; ativa e acompanhada são', async () => {
    const t = await novaProposicao({ situacaoEditorial: 'triagem' })
    const d = await novaProposicao({ situacaoEditorial: 'descartada' })
    const a = await novaProposicao({ situacaoEditorial: 'ativa' })
    const m = await novaProposicao({ situacaoEditorial: 'monitorada' })
    const r = await payload.find({ collection: 'proposicoes', overrideAccess: false, where: { id: { in: [t.id, d.id, a.id, m.id] } }, limit: 10 })
    expect(r.docs.map((x) => x.id).sort()).toEqual([a.id, m.id].sort())
  })
})

describe('apoio ao trabalho do autor', () => {
  it('calcula a nota de relevância pelo dicionário', async () => {
    await payload.delete({ collection: 'palavras-chave', where: { termo: { in: ['garimpo', 'dia nacional'] } } })
    await payload.create({ collection: 'palavras-chave', data: { termo: 'garimpo', peso: 9, grupo: 'Mineração' } })
    await payload.create({ collection: 'palavras-chave', data: { termo: 'dia nacional', peso: 0, exclusao: true } })
    const p = await novaProposicao({ ementa: 'Cria licença para garimpo de pequeno porte.' })
    expect(p.relevancia).toBeGreaterThan(50)
    expect(p.termosEncontrados).toEqual(['garimpo'])
    const h = await novaProposicao({ ementa: 'Institui o Dia Nacional do Garimpo.' })
    expect(h.relevancia).toBe(0)
  })

  it('correção que procede vira registro público, uma vez só', async () => {
    const prop = await novaProposicao()
    const par = await payload.create({ collection: 'pareceres', data: { proposicao: prop.id, status: 'rascunho' } })
    const ped = await payload.create({ collection: 'pedidos', data: { tipo: 'correcao', email: 'x@exemplo.com', texto: 'Placar errado na comissão.', parecer: par.id } })
    await payload.update({ collection: 'pedidos', id: ped.id, data: { decisao: 'procede', correcaoPublica: 'Placar corrigido para 21 a 12.' } })
    await payload.update({ collection: 'pedidos', id: ped.id, data: { resposta: 'Obrigado.' } })
    const c = await payload.find({ collection: 'correcoes', where: { pedido: { equals: ped.id } } })
    expect(c.totalDocs).toBe(1)
    expect(c.docs[0].descricao).toBe('Placar corrigido para 21 a 12.')
  })
})
