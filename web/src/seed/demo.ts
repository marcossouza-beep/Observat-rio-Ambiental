/**
 * Conteúdo de DEMONSTRAÇÃO (fictício, o mesmo do protótipo) para ver o site e rodar os testes.
 *   pnpm seed:demo            cria (idempotente)
 *   DEMO_LIMPAR=1 pnpm seed:demo   remove tudo o que é de demonstração
 * Trava: não roda em produção nem em banco do Supabase, salvo DEMO_FORCAR=1.
 */
import { getPayload, type Payload } from 'payload'
import config from '../payload.config'

const url = process.env.DATABASE_URL || ''
if ((process.env.NODE_ENV === 'production' || /supabase|pooler/i.test(url)) && process.env.DEMO_FORCAR !== '1') {
  console.error('Conteúdo de demonstração bloqueado neste banco (produção). Use DEMO_FORCAR=1 só se tiver certeza.')
  process.exit(1)
}

const p = (t: string) => ({
  type: 'paragraph', format: '', indent: 0, version: 1, direction: 'ltr', textFormat: 0,
  children: [{ type: 'text', text: t, format: 0, detail: 0, mode: 'normal', style: '', version: 1 }],
})
const rich = (...ts: string[]) => ({ root: { type: 'root', format: '', indent: 0, version: 1, direction: 'ltr', children: ts.map(p) } })
const dias = (n: number) => new Date(Date.now() + n * 864e5).toISOString()

type Lei = {
  id: string; sigla: string; numero: number; ano: number; titulo: string; esfera: 'federal' | 'estadual'; uf?: string; casa: string
  status: string; etapa?: string; statusOficial?: string; ementa: string; art1?: string; temas: string[]; biomas: string[]
  situacao: 'ativa' | 'monitorada'; autor: [string, string, string]; relator?: [string, string, string, string]
  parecer?: { impacto: string; carater: string; resumo: string; oQueMuda: string }
  pauta?: [number, string]; votacao?: [number, string, number, number]; emendas?: number
}

/** Texto base de demonstração (fictício), no formato em que sai da extração do PDF oficial. */
const TEXTOS: Record<string, string> = {
  lic: `Dispensa de estudo prévio de impacto ambiental as atividades agropecuárias em imóveis rurais de médio porte.
O CONGRESSO NACIONAL decreta:
Art. 1º Esta Lei estabelece hipóteses de dispensa do estudo prévio de impacto ambiental para atividades
agropecuárias.
Art. 3º Ficam dispensadas de estudo prévio de impacto ambiental as atividades agropecuárias em imóveis rurais de até 15 módulos fiscais.
§ 1º A dispensa será declarada pelo próprio empreendedor, em formulário eletrônico.
Art. 7º O órgão estadual poderá exigir estudo complementar em caso de dano ambiental comprovado.
Art. 9º Esta Lei entra em vigor na data de sua publicação.
JUSTIFICAÇÃO
O licenciamento das atividades agropecuárias de médio porte impõe custos desproporcionais ao produtor.
A proposta simplifica o procedimento sem afastar a responsabilidade por dano.`,
  resex: `CAPÍTULO I
DA CRIAÇÃO
Art. 1º Fica criada a Reserva Extrativista do Baixo Rio Exemplo, no município de Exemplo, com área aproximada
de 48 mil hectares, conforme memorial descritivo anexo.
Art. 2º São objetivos da Reserva:
I – proteger os meios de vida e a cultura das comunidades extrativistas;
II – assegurar o uso sustentável dos recursos naturais da área;
III – conservar a floresta e a várzea do Baixo Rio Exemplo.
CAPÍTULO II
DA GESTÃO
Art. 3º A Reserva será gerida pelo órgão estadual de meio ambiente, com conselho deliberativo.
Parágrafo único. O conselho terá participação majoritária das comunidades residentes.
Art. 4º O uso dos recursos naturais observará o plano de manejo, aprovado pelo conselho deliberativo.
Art. 5º Esta Lei entra em vigor na data de sua publicação.
JUSTIFICAÇÃO
A área sofre pressão crescente de extração ilegal de madeira e de pesca predatória e hoje não conta com proteção legal específica.`,
}

/** Quadro do cotejo de demonstração: regime vigente × proposta, ponto a ponto. */
const COTEJOS: Record<string, { dispositivo: string; vigente: string; proposto: string; efeito: 'amplia' | 'reduz' | 'neutro' }[]> = {
  lic: [
    { dispositivo: 'Art. 3º', vigente: 'Estudo prévio exigido conforme porte e potencial poluidor da atividade.', proposto: 'Dispensa do estudo para imóveis de até 15 módulos fiscais.', efeito: 'reduz' },
    { dispositivo: 'Art. 3º, § 1º', vigente: 'Enquadramento feito pelo órgão licenciador.', proposto: 'Dispensa declarada pelo próprio empreendedor.', efeito: 'reduz' },
    { dispositivo: 'Art. 7º', vigente: 'Estudo exigível antes da atividade.', proposto: 'Estudo complementar só após dano comprovado.', efeito: 'reduz' },
  ],
  resex: [
    { dispositivo: 'Art. 1º', vigente: 'Área sem proteção legal específica.', proposto: 'Reserva Extrativista de uso sustentável, com 48 mil hectares.', efeito: 'amplia' },
    { dispositivo: 'Art. 4º', vigente: 'Uso dos recursos sem regras próprias.', proposto: 'Uso conforme plano de manejo aprovado pelo conselho.', efeito: 'amplia' },
    { dispositivo: 'Art. 3º', vigente: 'Sem gestão definida.', proposto: 'Gestão estadual com conselho deliberativo de maioria comunitária.', efeito: 'amplia' },
  ],
  agua: [
    { dispositivo: 'Art. 2º', vigente: 'Outorga individual, por usuário.', proposto: 'Outorga única para um grupo de produtores da mesma bacia.', efeito: 'reduz' },
    { dispositivo: 'Art. 4º', vigente: 'Volume retirado controlado por usuário.', proposto: 'Volume controlado pelo grupo, sem medição individual obrigatória.', efeito: 'reduz' },
  ],
  caat: [
    { dispositivo: 'Art. 2º', vigente: 'Sem metas de recomposição para o bioma.', proposto: 'Metas de recomposição da vegetação nativa até 2035.', efeito: 'amplia' },
    { dispositivo: 'Art. 6º', vigente: 'Sem fonte de recursos própria.', proposto: 'Recursos do fundo do clima destinados ao programa.', efeito: 'amplia' },
  ],
}

const LEIS: Lei[] = [
  { id: 'lic', sigla: 'PL', numero: 1234, ano: 2026, titulo: 'Licenciamento simplificado para fazendas de médio porte', esfera: 'federal', casa: 'camara', status: 'em_tramitacao', etapa: 'Plenário', statusOficial: 'Pronto para pauta no Plenário', ementa: 'Dispensa de estudo prévio de impacto ambiental as atividades agropecuárias em imóveis rurais de médio porte e transfere a decisão aos municípios.', art1: 'Esta Lei estabelece hipóteses de dispensa do estudo prévio de impacto ambiental para atividades agropecuárias.', temas: ['Licenciamento'], biomas: ['Cerrado', 'Amazônia'], situacao: 'ativa', autor: ['Dep. Exemplo F', 'PARTIDO', 'GO'], relator: ['Dep. Exemplo G', 'PARTIDO', 'MT', 'Plenário'], parecer: { impacto: 'alto', carater: 'malefico', resumo: 'O projeto dispensa o estudo de impacto ambiental para atividades agropecuárias em imóveis de médio porte, com declaração do próprio produtor.', oQueMuda: 'Hoje o estudo prévio é exigido conforme o porte e o potencial poluidor. O projeto cria uma dispensa ampla, decidida pelo próprio interessado.' }, pauta: [2, 'Plenário da Câmara'], votacao: [-12, 'Comissão de Meio Ambiente', 21, 12], emendas: 7 },
  { id: 'pant', sigla: 'PL', numero: 140, ano: 2026, titulo: 'Regras de proteção do Pantanal', esfera: 'federal', casa: 'senado', status: 'em_tramitacao', etapa: 'Comissões', statusOficial: 'Aguardando votação na Comissão de Meio Ambiente', ementa: 'Estabelece regras de conservação, proteção, restauração e uso sustentável do bioma Pantanal.', temas: ['Florestas', 'Água'], biomas: ['Pantanal'], situacao: 'ativa', autor: ['Sen. Exemplo A', 'PARTIDO', 'MS'], relator: ['Sen. Exemplo B', 'PARTIDO', 'MT', 'Comissão de Meio Ambiente'], pauta: [4, 'Comissão de Meio Ambiente do Senado'], emendas: 4 },
  { id: 'resex', sigla: 'PL', numero: 123, ano: 2026, titulo: 'Nova reserva extrativista no Baixo Rio Exemplo', esfera: 'estadual', uf: 'PA', casa: 'assembleia', status: 'em_tramitacao', etapa: 'Plenário', ementa: 'Cria a Reserva Extrativista do Baixo Rio Exemplo, com 48 mil hectares, para comunidades extrativistas.', temas: ['Unidades de conservação', 'Povos e comunidades'], biomas: ['Amazônia'], situacao: 'ativa', autor: ['Dep. Est. Exemplo C', 'PARTIDO', 'PA'], parecer: { impacto: 'alto', carater: 'benefico', resumo: 'Cria uma unidade de conservação de uso sustentável com 48 mil hectares para comunidades extrativistas.', oQueMuda: 'A área passa a ter proteção legal e plano de manejo, com uso pelas comunidades tradicionais.' }, pauta: [6, 'Plenário da Alepa'] },
  { id: 'agua', sigla: 'Lei', numero: 4567, ano: 2026, titulo: 'Outorga coletiva de água para irrigação', esfera: 'estadual', uf: 'TO', casa: 'assembleia', status: 'norma', ementa: 'Permite que produtores de uma mesma bacia dividam uma única autorização de uso da água.', temas: ['Água'], biomas: ['Cerrado'], situacao: 'ativa', autor: ['Poder Executivo', '', ''], parecer: { impacto: 'alto', carater: 'enfraquece_indiretamente', resumo: 'A lei permite a outorga coletiva de água para irrigação, com uma única autorização para vários produtores da mesma bacia.', oQueMuda: 'O controle passa do usuário individual para o grupo, o que dificulta a fiscalização do volume retirado por cada um.' }, votacao: [-20, 'Plenário da Aleto', 18, 4] },
  { id: 'caat', sigla: 'Lei', numero: 15099, ano: 2026, titulo: 'Programa nacional de restauração da Caatinga', esfera: 'federal', casa: 'presidencia', status: 'norma', ementa: 'Institui o Programa Nacional de Restauração da Caatinga, com metas de recomposição da vegetação nativa até 2035.', temas: ['Florestas', 'Clima'], biomas: ['Caatinga'], situacao: 'ativa', autor: ['Sen. Exemplo D', 'PARTIDO', 'PE'], parecer: { impacto: 'alto', carater: 'benefico', resumo: 'Define metas de recomposição da vegetação nativa da Caatinga até 2035, com recursos do fundo do clima.', oQueMuda: 'Cria metas, prazos e fonte de recursos para a restauração do bioma, antes sem programa próprio.' } },
  { id: 'apps', sigla: 'PL', numero: 4512, ano: 2026, titulo: 'Marco temporal para áreas de preservação consolidadas', esfera: 'federal', casa: 'senado', status: 'em_tramitacao', etapa: 'Outra casa', statusOficial: 'Recebido da Câmara; aguardando distribuição', ementa: 'Considera consolidadas as ocupações em áreas de preservação permanente existentes até 2024.', temas: ['Florestas'], biomas: ['Mata Atlântica', 'Cerrado'], situacao: 'ativa', autor: ['Dep. Exemplo H', 'PARTIDO', 'SP'], votacao: [-30, 'Plenário da Câmara', 280, 150], emendas: 12 },
  { id: 'drones', sigla: 'PL', numero: 3010, ano: 2026, titulo: 'Uso de agrotóxicos por drones', esfera: 'federal', casa: 'camara', status: 'em_tramitacao', etapa: 'Apresentado', ementa: 'Regulamenta a aplicação de agrotóxicos por aeronaves não tripuladas.', temas: ['Agrotóxicos'], biomas: [], situacao: 'monitorada', autor: ['Dep. Exemplo I', 'PARTIDO', 'PR'] },
  { id: 'amgarimpo', sigla: 'PL', numero: 77, ano: 2026, titulo: 'Licença ambiental para garimpo de pequeno porte', esfera: 'estadual', uf: 'AM', casa: 'assembleia', status: 'em_tramitacao', ementa: 'Cria licença simplificada para garimpo de pequeno porte no Estado.', temas: ['Mineração', 'Licenciamento'], biomas: ['Amazônia'], situacao: 'monitorada', autor: ['Dep. Est. Exemplo J', 'PARTIDO', 'AM'] },
]

const AUTOR_SLUG = 'nome-do-autor'

async function idDe(payload: Payload, collection: 'temas' | 'biomas', nome: string) {
  const r = await payload.find({ collection, where: { nome: { equals: nome } }, limit: 1, depth: 0 })
  return r.docs[0]?.id
}

async function parlamentar(payload: Payload, [nome, partido, uf]: string[], casa: string) {
  if (!partido) return null
  const chave = `demo:${nome}`
  const r = await payload.find({ collection: 'parlamentares', where: { chaveOrigem: { equals: chave } }, limit: 1, depth: 0 })
  if (r.docs[0]) return r.docs[0].id
  const c = await payload.create({ collection: 'parlamentares', data: { nome, partido, uf, casa: casa as never, chaveOrigem: chave } })
  return c.id
}

/** Votos fictícios dos parlamentares da demonstração nas votações federais (página "Como votou"). */
async function votosDeExemplo(payload: Payload) {
  const parl = await payload.find({ collection: 'parlamentares', where: { chaveOrigem: { like: 'demo:' }, casa: { in: ['camara', 'senado'] } }, limit: 50, depth: 0, sort: 'nome' })
  const props = await payload.find({ collection: 'proposicoes', where: { chaveOrigem: { like: 'demo:' }, esfera: { equals: 'federal' } }, limit: 50, depth: 0 })
  const votacoes = await payload.find({ collection: 'votacoes', where: { proposicao: { in: props.docs.map((p) => p.id) } }, limit: 50, depth: 0 })
  const padrao = ['sim', 'nao', 'sim', 'ausente', 'nao', 'sim'] as const
  for (const [i, v] of votacoes.docs.entries()) {
    for (const [j, p] of parl.docs.entries()) {
      const existe = await payload.count({ collection: 'votos', where: { votacao: { equals: v.id }, parlamentar: { equals: p.id } } })
      if (!existe.totalDocs) await payload.create({ collection: 'votos', data: { votacao: v.id, parlamentar: p.id, voto: padrao[(i + j) % padrao.length] } })
    }
  }
}

async function limpar(payload: Payload) {
  const demoParl = await payload.find({ collection: 'parlamentares', where: { chaveOrigem: { like: 'demo:' } }, limit: 200, depth: 0 })
  if (demoParl.docs.length) await payload.delete({ collection: 'votos', where: { parlamentar: { in: demoParl.docs.map((p) => p.id) } } })
  const props = await payload.find({ collection: 'proposicoes', where: { chaveOrigem: { like: 'demo:' } }, limit: 500, depth: 0 })
  const ids = props.docs.map((d) => d.id)
  if (ids.length) {
    for (const c of ['pareceres', 'tramitacoes', 'versoes', 'votacoes', 'emendas'] as const) await payload.delete({ collection: c, where: { proposicao: { in: ids } } })
    await payload.delete({ collection: 'compromissos', where: { proposicao: { in: ids } } })
    await payload.delete({ collection: 'proposicoes', where: { id: { in: ids } } })
  }
  await payload.delete({ collection: 'parlamentares', where: { chaveOrigem: { like: 'demo:' } } })
  await payload.delete({ collection: 'artigos', where: { slug: { like: 'demo-' } } })
  await payload.delete({ collection: 'autores', where: { slug: { equals: AUTOR_SLUG } } })
  payload.logger.info(`Demonstração removida (${ids.length} proposições).`)
}

async function criar(payload: Payload) {
  const autorExist = await payload.find({ collection: 'autores', where: { slug: { equals: AUTOR_SLUG } }, limit: 1 })
  const autor =
    autorExist.docs[0] ||
    (await payload.create({ collection: 'autores', data: { nome: 'Nome do Autor', slug: AUTOR_SLUG, titulo: 'Mestre em Direito Ambiental', redes: { lattes: 'https://lattes.cnpq.br/0000000000000000' } } }))

  let n = 0
  for (const l of LEIS) {
    const chave = `demo:${l.id}`
    const existe = await payload.find({ collection: 'proposicoes', where: { chaveOrigem: { equals: chave } }, limit: 1, depth: 0 })
    if (existe.docs[0]) continue
    const autorId = await parlamentar(payload, l.autor, l.casa === 'assembleia' ? 'assembleia' : l.casa === 'senado' ? 'senado' : 'camara')
    const relId = l.relator ? await parlamentar(payload, l.relator, l.casa === 'senado' ? 'senado' : 'camara') : null
    const temas = (await Promise.all(l.temas.map((t) => idDe(payload, 'temas', t)))).filter(Boolean) as number[]
    const biomas = (await Promise.all(l.biomas.map((b) => idDe(payload, 'biomas', b)))).filter(Boolean) as number[]
    const prop = await payload.create({
      collection: 'proposicoes',
      data: {
        sigla: l.sigla, numero: l.numero, ano: l.ano, titulo: l.titulo, esfera: l.esfera, uf: l.uf, casa: l.casa as never,
        statusSimplificado: l.status as never, etapa: l.etapa, statusOficial: l.statusOficial, ementa: l.ementa, art1: l.art1,
        temas, biomas, situacaoEditorial: l.situacao, chaveOrigem: chave, origem: 'manual',
        dataApresentacao: dias(-120), ultimaMovimentacao: dias(-LEIS.indexOf(l)),
        urlFonte: 'https://www.exemplo.gov.br/proposicao-ficticia',
        autoria: [
          autorId ? { parlamentar: autorId, papel: 'autor' as const } : { nomeLivre: l.autor[0], papel: 'autor' as const },
          ...(relId ? [{ parlamentar: relId, papel: 'relator' as const, orgao: l.relator![3] }] : []),
        ],
      },
    })
    await payload.create({ collection: 'tramitacoes', data: { proposicao: prop.id, data: dias(-120), orgao: 'Mesa', descricao: 'Apresentação da proposição.', tipoEvento: 'apresentacao' } })
    if (l.pauta) await payload.create({ collection: 'tramitacoes', data: { proposicao: prop.id, data: dias(l.pauta[0]), orgao: l.pauta[1], descricao: 'Incluída na pauta.', tipoEvento: 'pauta' } })
    if (l.votacao)
      await payload.create({ collection: 'votacoes', data: { proposicao: prop.id, data: dias(l.votacao[0]), orgao: l.votacao[1], placarSim: l.votacao[2], placarNao: l.votacao[3], resultado: 'Aprovado' } })
    for (let i = 0; i < (l.emendas || 0); i++) await payload.create({ collection: 'emendas', data: { proposicao: prop.id, numero: String(i + 1), data: dias(-60 + i) } })
    const textoV1 = TEXTOS[l.id] || (l.art1 ? `Art. 1º ${l.art1}` : undefined)
    const v = await payload.create({ collection: 'versoes', data: { proposicao: prop.id, data: dias(-120), tipo: 'original', rotulo: 'Texto original', texto: textoV1 } })
    if (l.parecer) {
      await payload.create({
        collection: 'pareceres',
        data: {
          proposicao: prop.id, status: 'publicado', impacto: l.parecer.impacto as never, carater: l.parecer.carater as never, autor: autor.id, versaoTexto: v.id, areas: temas, biomas,
          secoes: {
            resumo: rich(l.parecer.resumo), oQueMuda: rich(l.parecer.oQueMuda), comparativo: COTEJOS[l.id] || [],
            oQueE: rich(`${l.ementa} Hoje: ${l.etapa || 'em vigor'}.`),
            classificacao: rich('Impacto e caráter definidos pelo autor, com a justificativa de cada um em uma linha.'),
            porQueImporta: rich('Quem ganha, quem perde e o que está em jogo com a proposta.'),
            pontosAtencao: rich('Pontos que merecem atenção na votação e na regulamentação.'),
            proximosPassos: rich('Etapa atual da tramitação e o que vem a seguir.'),
          },
          seo: { palavraChave: `${l.sigla} ${l.numero}/${l.ano}`, nomePopular: l.titulo },
        } as never,
      })
    }
    if (l.id === 'lic') {
      // Substitutivo depois do parecer: o sistema marca o parecer como desatualizado e abre o prazo de atualização.
      await payload.create({
        collection: 'versoes',
        data: {
          proposicao: prop.id,
          data: dias(-2),
          tipo: 'substitutivo',
          rotulo: 'Substitutivo do relator (Plenário)',
          texto: 'Art. 3º Ficam dispensadas de estudo prévio de impacto ambiental as atividades agropecuárias em imóveis rurais de até 30 módulos fiscais. § 2º A dispensa não se aplica a imóveis situados em zona de amortecimento de unidade de conservação. Art. 7º O órgão municipal ou estadual poderá exigir estudo complementar em caso de dano ambiental comprovado.',
        },
      })
    }
    n++
  }

  const TRIAGEM: [string, number, string][] = [
    ['t1', 4877, 'Altera a Lei nº 9.985, de 2000, para permitir a recategorização de unidades de conservação por ato do Poder Executivo.'],
    ['t2', 2301, 'Dispõe sobre a criação de tilápia e de outras espécies exóticas em reservatórios de usinas hidrelétricas.'],
    ['t3', 5120, 'Institui o Dia Nacional do Ipê, a ser celebrado anualmente em 15 de agosto.'],
  ]
  for (const [id, numero, ementa] of TRIAGEM) {
    const chave = `demo:${id}`
    const e = await payload.find({ collection: 'proposicoes', where: { chaveOrigem: { equals: chave } }, limit: 1, depth: 0 })
    if (!e.docs[0]) await payload.create({ collection: 'proposicoes', data: { sigla: 'PL', numero, ano: 2026, esfera: 'federal', casa: 'camara', ementa, situacaoEditorial: 'triagem', chaveOrigem: chave, origem: 'manual' } as never })
  }

  const artigos = [
    { slug: 'demo-licenciamento-2026-flexibilizacao-estados', titulo: 'Licenciamento em 2026: a flexibilização chega aos estados', resumo: 'Projetos estaduais repetem a lógica da dispensa por porte. O que isso muda na prática.', tipo: 'tendencia' },
    { slug: 'demo-o-que-e-um-substitutivo', titulo: 'O que é um substitutivo e por que ele muda tudo', resumo: 'Quando o relator reescreve o projeto, o texto votado pode ser outro. Entenda.', tipo: 'explicador' },
  ]
  for (const a of artigos) {
    const r = await payload.find({ collection: 'artigos', where: { slug: { equals: a.slug } }, limit: 1 })
    if (!r.docs[0]) await payload.create({ collection: 'artigos', data: { ...a, tipo: a.tipo as never, status: 'publicado', autor: autor.id, corpo: rich(a.resumo, 'Texto de demonstração.') } as never })
  }
  const pant = await payload.find({ collection: 'biomas', where: { nome: { equals: 'Pantanal' } }, limit: 1 })
  if (pant.docs[0] && !pant.docs[0].textoAbertura)
    await payload.update({ collection: 'biomas', id: pant.docs[0].id, data: { textoAbertura: 'Maior planície alagável do mundo. O fogo, a pecuária e o zoneamento das áreas alagáveis dominam a agenda.' } })
  await votosDeExemplo(payload)
  payload.logger.info(`Demonstração criada: ${n} proposições novas.`)
}

const payload = await getPayload({ config: await config })
if (process.argv.includes('--limpar') || process.env.DEMO_LIMPAR === '1') await limpar(payload)
else await criar(payload)
process.exit(0)
