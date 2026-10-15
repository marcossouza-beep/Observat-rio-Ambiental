/**
 * Coleta de ponta a ponta com o banco, alimentada pelas respostas reais gravadas em tests/fixtures/coleta.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { beforeAll, describe, expect, it } from 'vitest'
import { mapearPautaCamara } from '@/coleta/camara/mapear'
import { coletarFonte } from '@/coleta/executar'
import { acharProposicao } from '@/coleta/gravar'

let payload: Payload

const corpo = (nome: string) => JSON.parse(readFileSync(path.resolve(__dirname, '../fixtures/coleta', `${nome}.json`), 'utf8')).corpo
const dados = (nome: string) => corpo(nome).dados

/** Busca falsa: cada endereço das APIs devolve a resposta gravada correspondente. */
function buscaGravada(extra: { semPauta?: boolean; fichaQuebrada?: boolean } = {}) {
  const ficha = dados('camara/pl3729-ficha')
  return async (url: string): Promise<unknown> => {
    const u = new URL(url)
    const p = u.pathname
    // Câmara
    if (p.endsWith('/api/v2/proposicoes')) {
      if (u.searchParams.get('codTema')) return { dados: [], links: [] }
      return { dados: [{ id: ficha.id, siglaTipo: ficha.siglaTipo, numero: ficha.numero, ano: ficha.ano, ementa: ficha.ementa }], links: [] }
    }
    if (p.endsWith('/proposicoes/257161')) return extra.fichaQuebrada ? { dados: { ...ficha, ementa: '' } } : corpo('camara/pl3729-ficha')
    if (p.endsWith('/proposicoes/257161/autores')) return corpo('camara/pl3729-autores')
    if (p.endsWith('/proposicoes/257161/temas')) return corpo('camara/pl3729-temas')
    if (p.endsWith('/proposicoes/257161/tramitacoes')) return corpo('camara/pl3729-tramitacoes')
    if (p.endsWith('/proposicoes/257161/votacoes')) return corpo('camara/pl3729-votacoes')
    if (p.endsWith('/votacoes/257161-483/votos')) return corpo('camara/votacao-votos')
    if (p.endsWith('/votacoes/257161-483/orientacoes')) return corpo('camara/votacao-orientacoes')
    if (/\/votacoes\/[^/]+\/(votos|orientacoes)$/.test(p)) return { dados: [] }
    if (p.endsWith('/api/v2/eventos')) return corpo('camara/eventos')
    if (/\/eventos\/83037\/pauta$/.test(p)) return extra.semPauta ? { dados: [] } : corpo('camara/pauta')
    if (/\/eventos\/\d+\/pauta$/.test(p)) return { dados: [] }
    // Senado
    if (p.endsWith('/dadosabertos/processo')) return corpo('senado/processo-busca')
    if (p.endsWith('/processo/8079566')) return corpo('senado/processo-detalhe')
    if (p.endsWith('/processo/relatoria')) return corpo('senado/processo-relatoria')
    if (p.endsWith('/dadosabertos/votacao')) return corpo('senado/votacao-processo')
    if (p.includes('/plenario/agenda/mes/')) return corpo('senado/agenda-plenario-mes')
    if (p.includes('/comissao/agenda/')) return corpo('senado/agenda-comissoes')
    throw new Error(`Endereço sem resposta gravada: ${url}`)
  }
}

// A reunião gravada (evento 83037) foi em 14/10/2026: a "hora atual" do teste é antes dela.
const AGORA = new Date('2026-10-13T12:00:00.000Z')

beforeAll(async () => {
  payload = await getPayload({ config: await config })
  for (const c of ['alertas', 'votos', 'votacoes', 'versoes', 'tramitacoes', 'emendas', 'pareceres', 'compromissos', 'proposicoes', 'parlamentares', 'coletas', 'verificacoes', 'fontes'] as const)
    await payload.delete({ collection: c, where: { id: { exists: true } } })
  await payload.updateGlobal({ slug: 'ajustes', data: { coleta: { notaMinima: 99, maxNovas: 5 } } })
})

describe('coleta da Câmara e do Senado', () => {
  let lic: number
  let pautaChave: string

  it('Câmara: atualiza a proposta acompanhada, grava histórico, votos e pauta', async () => {
    // O autor já acompanha o PL 2159/2021 (cadastro manual) e uma proposta que está na pauta da semana
    lic = (await payload.create({ collection: 'proposicoes', data: { esfera: 'federal', sigla: 'PL', numero: 2159, ano: 2021, titulo: 'Lei Geral do Licenciamento', situacaoEditorial: 'monitorada' } })).id
    const itemPauta = mapearPautaCamara(dados('camara/eventos').find((e: { id: number }) => e.id === 83037) || dados('camara/pauta-evento'), dados('camara/pauta'))[0]
    pautaChave = itemPauta.chave
    await payload.create({ collection: 'proposicoes', data: { esfera: 'federal', sigla: 'PL', numero: 9999, ano: 2026, situacaoEditorial: 'monitorada', chaveOrigem: itemPauta.proposicao } })

    const r = await coletarFonte(payload, 'camara', { agora: AGORA, buscar: buscaGravada() })
    expect(r.avisos).toEqual([])
    expect(r.ok).toBe(true)
    expect(r.balanco).toMatchObject({ novas: 0, atualizadas: 1 })
    expect(r.balanco!.tramitacoes).toBeGreaterThan(300)
    expect(r.balanco!.votacoes).toBe(5)
    expect(r.balanco!.votos).toBeGreaterThan(300)
    expect(r.balanco!.pautas).toBe(1)

    const p = await payload.findByID({ collection: 'proposicoes', id: lic, depth: 0 })
    expect(p.chavesExtras).toContain('camara:257161')
    expect(p.statusSimplificado).toBe('norma')
    expect(p.titulo).toBe('Lei Geral do Licenciamento') // o que o autor escreveu fica
    expect(p.autoria?.length).toBeGreaterThan(3)

    const votacao = (await payload.find({ collection: 'votacoes', where: { chaveOrigem: { equals: 'camara:votacao:257161-483' } } })).docs[0]
    expect(votacao).toMatchObject({ placarSim: 231, placarNao: 87, votosNominaisPublicados: true })

    // Radar: mudança de situação e entrada na pauta; o histórico de 2025 não vira alerta
    const alertas = await payload.find({ collection: 'alertas', limit: 50, depth: 0 })
    expect(alertas.docs.map((a) => a.tipo).sort()).toEqual(['pauta', 'situacao'])

    const fonte = (await payload.find({ collection: 'fontes', where: { slug: { equals: 'camara' } } })).docs[0]
    expect(fonte.ultimaColetaOk).toBe(AGORA.toISOString())
    expect(fonte.itensUltimaColeta).toBe(1)
  }, 120_000)

  it('coletar de novo não duplica nada', async () => {
    const antes = await Promise.all((['tramitacoes', 'versoes', 'votacoes', 'votos', 'alertas', 'parlamentares'] as const).map((c) => payload.count({ collection: c })))
    const r = await coletarFonte(payload, 'camara', { agora: new Date(AGORA.getTime() + 36e5), buscar: buscaGravada() })
    expect(r.ok).toBe(true)
    const depois = await Promise.all((['tramitacoes', 'versoes', 'votacoes', 'votos', 'alertas', 'parlamentares'] as const).map((c) => payload.count({ collection: c })))
    expect(depois.map((d) => d.totalDocs)).toEqual(antes.map((a) => a.totalDocs))
  }, 120_000)

  it('o que saiu de pauta sai da agenda', async () => {
    const r = await coletarFonte(payload, 'camara', { agora: new Date(AGORA.getTime() + 2 * 36e5), buscar: buscaGravada({ semPauta: true }) })
    expect(r.balanco!.pautasRemovidas).toBe(1)
    expect((await payload.count({ collection: 'tramitacoes', where: { chaveOrigem: { equals: pautaChave } } })).totalDocs).toBe(0)
  }, 120_000)

  it('Senado: a mesma proposta, sem duplicar; votação nominal com 81 senadores', async () => {
    const r = await coletarFonte(payload, 'senado', { agora: AGORA, buscar: buscaGravada() })
    expect(r.ok).toBe(true)
    expect(r.balanco!.novas).toBe(0)
    expect(r.avisos).toEqual([])
    expect((await payload.count({ collection: 'proposicoes', where: { sigla: { equals: 'PL' }, numero: { equals: 2159 }, ano: { equals: 2021 } } })).totalDocs).toBe(1)
    const p = await payload.findByID({ collection: 'proposicoes', id: lic, depth: 0 })
    expect(p.chavesExtras).toEqual(expect.arrayContaining(['camara:257161', 'senado:8079566', 'senado:materia:148785']))
    // A agenda do Plenário do Senado cita a matéria pelo código antigo: acha pela chave extra
    expect((await acharProposicao(payload, ['senado:materia:148785']))?.id).toBe(lic)
    const v = (await payload.find({ collection: 'votacoes', where: { chaveOrigem: { equals: 'senado:votacao:6935' } } })).docs[0]
    expect(v.votosNominaisPublicados).toBe(true)
    expect((await payload.count({ collection: 'votos', where: { votacao: { equals: v.id } } })).totalDocs).toBe(81)
    expect((await payload.count({ collection: 'parlamentares', where: { casa: { equals: 'senado' } } })).totalDocs).toBeGreaterThanOrEqual(81)
  }, 120_000)

  it('formato mudou: a coleta para, avisa e não finge estar em dia', async () => {
    const antes = (await payload.find({ collection: 'fontes', where: { slug: { equals: 'camara' } } })).docs[0]
    const r = await coletarFonte(payload, 'camara', { agora: new Date(AGORA.getTime() + 5 * 36e5), buscar: buscaGravada({ fichaQuebrada: true }) })
    expect(r.ok).toBe(false)
    expect(r.erro).toMatch(/ementa/)
    const depois = (await payload.find({ collection: 'fontes', where: { slug: { equals: 'camara' } } })).docs[0]
    expect(depois.ultimaColetaOk).toBe(antes.ultimaColetaOk)
    expect(depois.erro).toMatch(/Formato da Câmara mudou/)
    const v = await payload.find({ collection: 'verificacoes', where: { resultado: { equals: 'falha' } } })
    expect(v.docs[0].detalhe).toMatch(/Câmara dos Deputados/)
  }, 120_000)

  it('apagar a proposição leva junto o que é dela; com parecer, não deixa', async () => {
    const par = await payload.create({ collection: 'pareceres', data: { proposicao: lic, status: 'rascunho' } })
    await expect(payload.delete({ collection: 'proposicoes', id: lic })).rejects.toThrow(/Apague o parecer antes/)
    await payload.delete({ collection: 'pareceres', id: par.id })
    await payload.delete({ collection: 'proposicoes', id: lic })
    for (const c of ['tramitacoes', 'versoes', 'votacoes', 'alertas'] as const) expect((await payload.count({ collection: c, where: { proposicao: { equals: lic } } })).totalDocs).toBe(0)
  }, 120_000)
})
