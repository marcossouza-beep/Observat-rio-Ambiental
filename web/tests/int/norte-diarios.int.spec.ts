/**
 * Fase 5 (Norte): rodadas completas dos conectores de Roraima (Diário da ALE-RR) e do Pará (Banco de Leis),
 * sobre edições e respostas reais gravadas.
 */
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { beforeAll, describe, expect, it } from 'vitest'
import { coletarFonte } from '@/coleta/executar'
import { criarConectorAlerr } from '@/coleta/alerr/conector'
import { criarConectorAlepa } from '@/coleta/alepa/conector'

let payload: Payload
const dir = path.resolve(__dirname, '../fixtures/coleta')
const corpo = (f: string) => JSON.parse(readFileSync(path.join(dir, f), 'utf8')).corpo
const AGORA = new Date('2026-10-16T12:00:00.000Z')

// Edições gravadas: 4743, 4746, 4747 e 4748; as outras da lista falham (como um PDF fora do ar)
const baixar = async (url: string) => {
  const n = /ED\.-(\d+)/.exec(url)?.[1]
  const f = path.join(dir, 'alerr', `ed-${n}.pdf`)
  if (!existsSync(f)) throw new Error('HTTP 404')
  return readFileSync(f)
}
const buscarRR = async (url: string) => {
  if (url.includes('/wp-json/wp/v2/media')) return corpo('alerr/midia.json')
  throw new Error(`sem amostra para ${url}`)
}
const buscarPA = async (url: string) => (url.includes('ano=2026') ? corpo('alepa/leis-2026.json') : { status: true, total: 0, resultados: [] })

async function palavra(termo: string, grupo: string, uf?: string) {
  await payload.delete({ collection: 'palavras-chave', where: { termo: { equals: termo } } })
  await payload.create({ collection: 'palavras-chave', data: { termo, grupo, peso: 10, uf } })
}

beforeAll(async () => {
  payload = await getPayload({ config: await config })
  for (const c of ['tramitacoes', 'versoes', 'alertas', 'coletas'] as const) await payload.delete({ collection: c, where: { id: { exists: true } } })
  await payload.delete({ collection: 'proposicoes', where: { or: [{ chaveOrigem: { like: 'alerr:' } }, { chaveOrigem: { like: 'alepa:' } }, { chaveOrigem: { equals: 'manual:rr:153' } }, { chaveOrigem: { equals: 'manual:pa:647' } }] } })
  await payload.delete({ collection: 'fontes', where: { slug: { in: ['casa-rr', 'leis-pa', 'casa-pa'] } } })
  await palavra('patrimônio cultural imaterial', 'Povos e comunidades', 'RR')
  await palavra('área de proteção ambiental', 'Unidades de conservação')
  await payload.updateGlobal({ slug: 'ajustes', data: { coleta: { notaMinima: 40, maxNovas: 5 } } })
  // Proposta de Roraima que o autor cadastrou à mão (sem chave da fonte): o diário a reconhece pelo número
  await payload.create({
    collection: 'proposicoes',
    data: { esfera: 'estadual', uf: 'RR', casa: 'assembleia', sigla: 'PL', numero: 153, ano: 2026, situacaoEditorial: 'monitorada', chaveOrigem: 'manual:rr:153' },
  })
})

describe('Roraima pelo Diário da ALE-RR', () => {
  it('traz a nova com palavra-chave do estado e atualiza a cadastrada à mão; as outras ficam de fora', async () => {
    const r = await coletarFonte(payload, 'casa-rr', { agora: AGORA, buscar: buscarRR, conector: criarConectorAlerr({ baixar }) })
    expect(r.ok).toBe(true)
    expect(r.balanco).toMatchObject({ novas: 1 })
    expect(r.avisos?.some((a) => /edição 474[0-9]: HTTP 404/.test(a))).toBe(true)

    const pl150 = (await payload.find({ collection: 'proposicoes', where: { chaveOrigem: { equals: 'alerr:PL-150-2026' } }, depth: 1 })).docs[0]
    expect(pl150).toMatchObject({ esfera: 'estadual', uf: 'RR', sigla: 'PL', numero: 150, situacaoEditorial: 'triagem', statusSimplificado: 'em_tramitacao' })
    expect(pl150.termosEncontrados).toContain('patrimônio cultural imaterial')
    const autor = pl150.autoria?.[0]?.parlamentar
    expect(typeof autor === 'object' && autor?.nome).toBe('Armando Neto')

    const manual = (await payload.find({ collection: 'proposicoes', where: { chaveOrigem: { equals: 'manual:rr:153' } }, depth: 0 })).docs[0]
    expect(manual.chavesExtras).toContain('alerr:PL-153-2026')
    const tram = await payload.find({ collection: 'tramitacoes', where: { proposicao: { equals: manual.id } }, depth: 0 })
    expect(tram.docs[0]).toMatchObject({ tipoEvento: 'apresentacao' })

    // Saúde vocal, PPA, orçamento etc. não têm palavra-chave ambiental nem de RR: não entram
    expect((await payload.count({ collection: 'proposicoes', where: { chaveOrigem: { like: 'alerr:' } } })).totalDocs).toBe(1)
  })

  it('coletar de novo não duplica', async () => {
    const r = await coletarFonte(payload, 'casa-rr', { agora: new Date(AGORA.getTime() + 36e5), buscar: buscarRR, conector: criarConectorAlerr({ baixar }) })
    expect(r.balanco).toMatchObject({ novas: 0, tramitacoes: 0 })
  })
})

describe('Pará pelo Banco de Leis da Alepa', () => {
  it('a lei nova da APA Bacajaí entra na triagem como norma estadual do Pará', async () => {
    const r = await coletarFonte(payload, 'leis-pa', { agora: AGORA, buscar: buscarPA })
    expect(r.ok).toBe(true)
    const apa = (await payload.find({ collection: 'proposicoes', where: { chaveOrigem: { equals: 'alepa:lei:32817' } }, depth: 0 })).docs[0]
    expect(apa).toMatchObject({ esfera: 'estadual', uf: 'PA', sigla: 'Lei', numero: 11665, statusSimplificado: 'norma', situacaoEditorial: 'triagem' })
    const fonte = (await payload.find({ collection: 'fontes', where: { slug: { equals: 'leis-pa' } } })).docs[0]
    expect(fonte).toMatchObject({ esfera: 'estadual', uf: 'PA', nivel: 'A' })
  })
})

describe('Pará pela pesquisa de proposições da Alepa', () => {
  // Projetos de lei ordinária e busca por "ambiental" respondem com as amostras; os outros tipos, painel vazio
  const postar = async (_url: string, pedido: Record<string, string>) =>
    pedido['model[Texto]'] === 'ambiental' ? painel('proposicoes-texto-ambiental') : pedido['model[IdTipoProposicao]'] === '3' ? painel('proposicoes-tipo-IdTipoProposicao') : ''
  const painel = (f: string) => corpo(`alepa/${f}.json`).html as string

  it('projetos ambientais novos entram na triagem; o cadastrado à mão é reconhecido pelo número', async () => {
    await payload.create({
      collection: 'proposicoes',
      data: { esfera: 'estadual', uf: 'PA', casa: 'assembleia', sigla: 'PL', numero: 647, ano: 2026, situacaoEditorial: 'monitorada', chaveOrigem: 'manual:pa:647' },
    })
    const obter = async (url: string) => {
      const id = /IdProposicao=(\d+)/.exec(url)?.[1]
      // Como o site real: sem tipo e situação no endereço, a página vem sem a tramitação
      if (id === '16347' && !url.includes('&tipo=')) return corpo('alepa/detalhes-16347-so-id.json').html as string
      if (id && ['16099', '16347', '16375'].includes(id)) return corpo(`alepa/detalhes-${id}.json`).html as string
      throw new Error('HTTP 404')
    }
    const r = await coletarFonte(payload, 'casa-pa', { agora: AGORA, conector: criarConectorAlepa({ postar, obter }) })
    expect(r.ok).toBe(true)
    const apa = (await payload.find({ collection: 'proposicoes', where: { chaveOrigem: { equals: 'alepa:proposicao:16099' } }, depth: 1 })).docs[0]
    // Pela página de detalhes: já virou a Lei 11.665, com andamentos, relatores e versões
    expect(apa).toMatchObject({ esfera: 'estadual', uf: 'PA', sigla: 'PL', numero: 461, situacaoEditorial: 'triagem', statusSimplificado: 'norma', statusOficial: 'Lei nº 11665' })
    expect((await payload.count({ collection: 'tramitacoes', where: { proposicao: { equals: apa.id } } })).totalDocs).toBe(15)
    expect((await payload.count({ collection: 'versoes', where: { proposicao: { equals: apa.id } } })).totalDocs).toBe(6)
    expect(apa.autoria?.filter((a) => a.papel === 'relator')).toHaveLength(3)
    const autor = apa.autoria?.[0]?.parlamentar
    expect(typeof autor === 'object' && autor?.nome).toBe('Torrinho Torres')
    const manual = (await payload.find({ collection: 'proposicoes', where: { chaveOrigem: { equals: 'manual:pa:647' } }, depth: 0 })).docs[0]
    expect(manual.chavesExtras).toContain('alepa:proposicao:16347')
    expect((await payload.count({ collection: 'tramitacoes', where: { proposicao: { equals: manual.id } } })).totalDocs).toBe(3)
    // "Gelo pai'dégua", utilidade pública, orçamento: sem palavra ambiental, não entram
    expect((await payload.count({ collection: 'proposicoes', where: { chaveOrigem: { equals: 'alepa:proposicao:16374' } } })).totalDocs).toBe(0)
  })

  it('página de detalhes fora do ar: a proposta entra com o cartão da lista e a rodada segue', async () => {
    const r = await coletarFonte(payload, 'casa-pa', {
      agora: new Date(AGORA.getTime() + 36e5),
      conector: criarConectorAlepa({ postar, obter: async () => Promise.reject(new Error('HTTP 503')) }),
    })
    expect(r.ok).toBe(true)
    expect(r.avisos?.some((a) => /detalhes de PL 461\/2026: HTTP 503/.test(a))).toBe(true)
  })
})
