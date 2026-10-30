/**
 * Texto vigente das leis alteradas: do texto da proposta à ficha da lei, com as respostas reais do normas.leg.br.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { preencherNormas } from '@/coleta/normas/preencher'
import { artigoDaLei } from '@/lib/alteracoes'

let payload: Payload
let prop: number
const corpo = (nome: string) => JSON.parse(readFileSync(path.resolve(__dirname, '../fixtures/coleta/normas', `${nome}.json`), 'utf8')).corpo.html as string
const chamadas: string[] = []
const baixar = async (url: string) => {
  chamadas.push(url)
  if (url.includes('/api/public/normas?urn=urn:lex:br:federal:lei:1981-08-31;6938')) return Buffer.from(corpo('normas-leg-6938'))
  if (url.includes('/api/public/binario/')) return Buffer.from(corpo('normas-leg-6938-vigente'))
  throw new Error(`sem amostra para ${url}`)
}

describe('texto vigente da lei alterada (normas.leg.br)', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    await payload.delete({ collection: 'normas-vigentes', where: { chave: { equals: 'lei-6938-1981' } } })
    const p = await payload.create({
      collection: 'proposicoes',
      data: { sigla: 'PL', numero: 9901, ano: 2026, esfera: 'federal', casa: 'camara', ementa: 'Altera a Lei nº 6.938, de 31 de agosto de 1981.', situacaoEditorial: 'ativa', chaveOrigem: 'teste:normas', origem: 'manual' } as never,
    })
    prop = p.id
    await payload.create({
      collection: 'versoes',
      data: { proposicao: prop, data: new Date().toISOString(), tipo: 'original', texto: 'Art. 1º O art. 10 da Lei nº 6.938, de 31 de agosto de 1981, passa a vigorar com a seguinte redação: “Art. 10. ........ § 5º Texto novo.” (NR) Art. 2º Esta Lei entra em vigor.' },
    })
  }, 60_000)
  afterAll(async () => {
    await payload.delete({ collection: 'versoes', where: { proposicao: { equals: prop } } })
    await payload.delete({ collection: 'proposicoes', id: prop })
    await payload.delete({ collection: 'normas-vigentes', where: { chave: { equals: 'lei-6938-1981' } } })
  })

  it('cria a ficha com o texto vigente, o nome popular e o endereço oficial', async () => {
    const r = await preencherNormas(payload, { baixar })
    expect(r).toMatchObject({ novas: 1, falhas: 0 })
    const n = (await payload.find({ collection: 'normas-vigentes', where: { chave: { equals: 'lei-6938-1981' } } })).docs[0]
    expect(n).toMatchObject({ rotulo: 'Lei nº 6.938/1981', nomePopular: 'Política Nacional do Meio Ambiente', origem: 'coleta', url: 'https://normas.leg.br/?urn=urn:lex:br:federal:lei:1981-08-31;6938' })
    expect(artigoDaLei(n.texto, '10')).toMatch(/^Art\. 10\. A construção, instalação/)
  })

  it('não busca de novo na mesma semana; texto colado pela equipe nunca é trocado', async () => {
    chamadas.length = 0
    expect(await preencherNormas(payload, { baixar })).toMatchObject({ novas: 0, conferidas: 0 })
    expect(chamadas).toHaveLength(0)
    const n = (await payload.find({ collection: 'normas-vigentes', where: { chave: { equals: 'lei-6938-1981' } } })).docs[0]
    await payload.update({ collection: 'normas-vigentes', id: n.id, data: { origem: 'manual', texto: 'Art. 10. Texto colado.' } })
    expect(await preencherNormas(payload, { baixar, agora: new Date(Date.now() + 30 * 864e5) })).toMatchObject({ conferidas: 0 })
    expect((await payload.findByID({ collection: 'normas-vigentes', id: n.id })).texto).toBe('Art. 10. Texto colado.')
  })

  it('texto de projeto longo (mais de 40 mil caracteres) é aceito', async () => {
    const longo = `Art. 1º ${'Texto longo do projeto. '.repeat(3000)}`
    const v = await payload.create({ collection: 'versoes', data: { proposicao: prop, data: new Date().toISOString(), tipo: 'substitutivo', texto: longo } })
    expect(v.texto?.length).toBeGreaterThan(40_000)
  })
})
