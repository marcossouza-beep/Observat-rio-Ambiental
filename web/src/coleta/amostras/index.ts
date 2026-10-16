/**
 * Grava respostas reais das APIs usadas pelos conectores, para os testes rodarem sem rede.
 * Roda no GitHub Actions (.github/workflows/amostras.yml), que salva o resultado em
 * tests/fixtures/coleta/ no próprio repositório.
 *
 * Uso: pnpm amostras                 (todas)
 *      pnpm amostras senado          (só as do Senado)
 *      pnpm amostras vetos,pdf,dou   (várias)
 *
 * Listas longas são cortadas (ver CORTE) para os arquivos ficarem pequenos.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { ErroHttp, obter } from '../http'
import { baixarEdicao, entrarInlabs } from '../dou/inlabs'
import { lerZip } from '../zip'

const CAMARA = 'https://dadosabertos.camara.leg.br/api/v2'
const SENADO = 'https://legis.senado.leg.br/dadosabertos'
const saida = path.resolve(process.cwd(), 'tests/fixtures/coleta')
const filtro = process.argv[2]
const CORTE = 40

const dia = (n = 0) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10)
const compacto = (d: string) => d.replace(/-/g, '')

type Gravada = { url: string; status: number | null; tipo: string; gravadaEm: string; corpo: unknown; erro?: string }
type Ctx = Record<string, unknown>

/** Corta listas longas em qualquer nível, guardando o tamanho original. */
export function cortar(v: unknown, limite = CORTE): unknown {
  if (Array.isArray(v)) {
    const r = v.slice(0, limite).map((x) => cortar(x, limite))
    return v.length > limite ? [...r, { _cortado: `${v.length - limite} itens a mais` }] : r
  }
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, cortar(x, limite)]))
  if (typeof v === 'string' && v.length > 4000) return v.slice(0, 4000) + '…'
  return v
}

async function buscar(url: string, limite = CORTE): Promise<Gravada> {
  const gravadaEm = new Date().toISOString()
  try {
    const r = await obter(url, { tentativas: 3, esperaBaseMs: 1500, tempoLimiteMs: 45_000, headers: { Accept: 'application/json' } })
    const tipo = r.headers.get('content-type') || ''
    const texto = await r.text()
    let corpo: unknown = texto
    try {
      corpo = JSON.parse(texto)
    } catch {
      corpo = texto.slice(0, 20_000)
    }
    return { url, status: r.status, tipo, gravadaEm, corpo: cortar(corpo, limite) }
  } catch (e) {
    const err = e as ErroHttp
    return { url, status: err.status ?? null, tipo: '', gravadaEm, corpo: null, erro: err.message }
  }
}

async function salvar(fonte: string, nome: string, g: Gravada) {
  await mkdir(path.join(saida, fonte), { recursive: true })
  await writeFile(path.join(saida, fonte, `${nome}.json`), JSON.stringify(g, null, 2) + '\n')
  console.log(`${g.status === 200 ? '✅' : '⚠️'} ${fonte}/${nome} · HTTP ${g.status ?? '—'}${g.erro ? ` · ${g.erro}` : ''}`)
  return g
}

const dados = (g: Gravada) => ((g.corpo as { dados?: unknown })?.dados ?? null) as unknown

/** Primeira lista de objetos encontrada numa resposta (o Senado embrulha as listas de formas variadas). */
export function primeiraLista(v: unknown, prof = 0): Record<string, unknown>[] {
  if (prof > 6 || !v) return []
  if (Array.isArray(v)) return v.filter((x) => x && typeof x === 'object') as Record<string, unknown>[]
  if (typeof v === 'object') for (const x of Object.values(v)) {
    const l = primeiraLista(x, prof + 1)
    if (l.length) return l
  }
  return []
}

/** Especificação OpenAPI reduzida aos caminhos de interesse e aos esquemas que eles usam. */
export function filtrarEspecificacao(spec: Record<string, unknown>, padrao: RegExp) {
  const paths = (spec.paths || {}) as Record<string, unknown>
  const escolhidos = Object.fromEntries(Object.entries(paths).filter(([p]) => padrao.test(p)))
  const esquemas = ((spec.components as { schemas?: Record<string, unknown> })?.schemas || {}) as Record<string, unknown>
  const usados = new Set<string>()
  const andar = (v: unknown) => {
    if (Array.isArray(v)) return v.forEach(andar)
    if (!v || typeof v !== 'object') return
    for (const [k, x] of Object.entries(v)) {
      if (k === '$ref' && typeof x === 'string') {
        const nome = x.split('/').pop()!
        if (!usados.has(nome) && esquemas[nome]) {
          usados.add(nome)
          andar(esquemas[nome])
        }
      } else andar(x)
    }
  }
  andar(escolhidos)
  return {
    info: spec.info,
    totalCaminhos: Object.keys(paths).length,
    todosOsCaminhos: Object.keys(paths),
    paths: escolhidos,
    schemas: Object.fromEntries([...usados].sort().map((n) => [n, esquemas[n]])),
  }
}

type Passo = { fonte: string; nome: string; rodar: (ctx: Ctx) => Promise<void> }

/** Assembleias do Norte com o SAPL (Interlegis) respondendo — Fase 5 (docs/LEVANTAMENTO.md). */
const SAPL_NORTE: Record<string, string> = {
  to: 'https://sapl.al.to.leg.br',
  ac: 'https://sapl.al.ac.leg.br',
  am: 'https://sapl.al.am.leg.br',
  ro: 'https://sapl.al.ro.leg.br',
  rr: 'https://sapl.al.rr.leg.br',
}
/** Nordeste (Fase 6): gravadas à parte (fonte sapl-ne), para não mexer nas amostras do Norte. */
const SAPL_NE: Record<string, string> = {
  al: 'https://sapl.al.al.leg.br',
  pb: 'https://sapl3.al.pb.leg.br',
  pi: 'https://sapl.al.pi.leg.br',
}

const resultados = (g: Gravada) => (((g.corpo as { results?: unknown })?.results as Record<string, unknown>[]) || [])

/** Matérias, tabelas, tramitação, autoria e autor de cada casa com SAPL. */
function passosSapl(fonte: string, casas: Record<string, string>): Passo[] {
  return [
  ...Object.entries(casas).map(
    ([uf, base]): Passo => ({
      fonte,
      nome: `${uf}-materias`,
      async rodar(ctx) {
        const g = await salvar('sapl', `${uf}-materias`, await buscar(`${base}/api/materia/materialegislativa/?page_size=20&ano=${new Date().getFullYear()}`))
        await salvar('sapl', `${uf}-materias-padrao`, await buscar(`${base}/api/materia/materialegislativa/?page_size=5`))
        ctx[`sapl_${uf}`] = resultados(g)
          .slice(0, 3)
          .map((m) => m.id)
      },
    }),
  ),
  {
    fonte,
    nome: 'detalhes',
    async rodar(ctx) {
      for (const [uf, base] of Object.entries(casas)) {
        const ids = (ctx[`sapl_${uf}`] as number[] | undefined) || []
        if (!ids.length) continue
        await salvar('sapl', `${uf}-tipos`, await buscar(`${base}/api/materia/tipomaterialegislativa/?page_size=100`, 100))
        await salvar('sapl', `${uf}-status`, await buscar(`${base}/api/materia/statustramitacao/?page_size=100`, 100))
        await salvar('sapl', `${uf}-unidades`, await buscar(`${base}/api/materia/unidadetramitacao/?page_size=100`, 100))
        for (const [i, id] of ids.slice(0, uf === 'to' ? 3 : 1).entries()) {
          await salvar('sapl', `${uf}-materia-${i}`, await buscar(`${base}/api/materia/materialegislativa/${id}/`))
          await salvar('sapl', `${uf}-tramitacao-${i}`, await buscar(`${base}/api/materia/tramitacao/?materia=${id}&page_size=100`))
          const aut = await salvar('sapl', `${uf}-autoria-${i}`, await buscar(`${base}/api/materia/autoria/?materia=${id}`))
          const autor = resultados(aut)[0]?.autor
          if (autor && i === 0) await salvar('sapl', `${uf}-autor`, await buscar(`${base}/api/base/autor/${autor}/`))
        }
        if (uf === 'to') await salvar('sapl', 'to-parlamentares', await buscar(`${base}/api/parlamentares/parlamentar/?page_size=40`))
      }
    },
  },
  ]
}

const PASSOS_SAPL: Passo[] = [
  {
    fonte: 'sapl',
    nome: 'especificacao',
    async rodar() {
      // Especificação da API (drf-spectacular), reduzida às partes que o conector usa
      for (const url of [`${SAPL_NORTE.to}/api/schema/?format=json`, `${SAPL_NORTE.to}/api/schema/`]) {
        const g = await buscar(url, 100000)
        if (g.status === 200 && g.corpo && typeof g.corpo === 'object') {
          g.corpo = filtrarEspecificacao(g.corpo as Record<string, unknown>, /^\/api\/(materia|base\/autor|parlamentares\/parlamentar|norma)/)
          await salvar('sapl', 'especificacao', g)
          return
        }
        await salvar('sapl', 'especificacao-tentativa', g)
      }
    },
  },
  ...passosSapl('sapl', SAPL_NORTE),
]

/** Página HTML inteira (até 400 mil caracteres), como navegador. */
async function gravarHtml(fonte: string, nome: string, url: string, form?: Record<string, string>) {
  const gravadaEm = new Date().toISOString()
  try {
    const r = await fetch(url, {
      method: form ? 'POST' : 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', 'Accept-Language': 'pt-BR', ...(form ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}) },
      body: form ? new URLSearchParams(form).toString() : undefined,
      signal: AbortSignal.timeout(45_000),
      redirect: 'follow',
    })
    // Páginas antigas (Alece) vêm em ISO-8859-1
    const latin1 = /iso-8859-1|latin1|windows-1252/i.test(r.headers.get('content-type') || '')
    const html = new TextDecoder(latin1 ? 'latin1' : 'utf-8').decode(await r.arrayBuffer())
    return salvar(fonte, nome, { url: r.url || url, status: r.status, tipo: r.headers.get('content-type') || '', gravadaEm, corpo: { html: html.slice(0, 400_000) } })
  } catch (e) {
    return salvar(fonte, nome, { url, status: null, tipo: '', gravadaEm, corpo: null, erro: (e as Error).message })
  }
}

/** PDF de uma URL para tests/fixtures/coleta/<fonte>/<nome>.pdf (diários). */
async function gravarPdf(fonte: string, nome: string, url: string) {
  try {
    const r = await obter(url, { tentativas: 2, esperaBaseMs: 1500, tempoLimiteMs: 90_000 })
    const buf = Buffer.from(await r.arrayBuffer())
    await mkdir(path.join(saida, fonte), { recursive: true })
    await writeFile(path.join(saida, fonte, `${nome}.pdf`), buf)
    console.log(`✅ ${fonte}/${nome}.pdf · ${Math.round(buf.length / 1024)} KB · ${r.headers.get('content-type')}`)
  } catch (e) {
    console.log(`⚠️ ${fonte} ${url} · ${(e as Error).message}`)
  }
}

/** Diários no sistema da EGBA (Bahia: Diário do Legislativo): lista de edições em JSON e o PDF da última. */
async function diarioEgba(fonte: string, base: string, subtema?: string) {
  const q = subtema ? `?subtheme=${subtema}` : ''
  const g = await salvar(fonte, 'ultimas-edicoes', await buscar(`${base}/apifront/portal/edicoes/ultimas_edicoes.json${q}`))
  const itens = ((g.corpo as { itens?: { id: number }[] } | null)?.itens || []).slice(0, 1)
  for (const e of itens) await gravarPdf(fonte, `edicao-${e.id}`, `${base}${subtema ? `/${subtema}` : ''}/portal/edicoes/download/${e.id}`)
}

/** Nordeste sem SAPL (Fase 6): Bahia (Diário do Legislativo) e Ceará (expediente e lista de proposições da Alece). */
const PASSOS_NE: Passo[] = [
  {
    fonte: 'alba',
    nome: 'diario',
    async rodar() {
      // O site da Alba só tem proposições até 01/08/2025; o SPL novo (nopapercloud) recusa o GitHub (Cloudflare)
      await diarioEgba('alba', 'https://egbanet.egba.ba.gov.br', 'alba')
    },
  },
  {
    fonte: 'alece',
    nome: 'expediente',
    async rodar() {
      const hist = await gravarHtml('alece', 'expediente-historico', 'https://www.al.ce.gov.br/legislativo/expediente-historico')
      const html = ((hist.corpo as { html?: string } | null)?.html || '') as string
      const id = /\/legislativo\/expediente-texto\/(\d+)/.exec(html)?.[1]
      if (id) await gravarHtml('alece', 'expediente-texto', `https://www.al.ce.gov.br/legislativo/expediente-texto/${id}`)
      // Lista por legislatura (www2), em ordem de número: primeira e última página
      const q = 'http://www2.al.ce.gov.br/legislativo/proposicoes/numero.php?nome=31_legislatura&tabela=projeto_lei&opcao=T'
      await gravarHtml('alece', 'projetos-lei-tramitando', q)
      await gravarHtml('alece', 'projetos-lei-ultima-pagina', `${q}&absolutepage=126`)
      await gravarHtml('alece', 'mensagens-tramitando', 'http://www2.al.ce.gov.br/legislativo/proposicoes/numero.php?nome=31_legislatura&tabela=projeto_mens&opcao=T')
    },
  },
]

/** Página inicial e até `max` links dela que casam com `re` (mesmo site), para achar onde ficam as proposições. */
async function gravarComLinks(fonte: string, inicio: string, re: RegExp, max = 4) {
  const g = await gravarHtml(fonte, 'inicio', inicio)
  const html = ((g.corpo as { html?: string } | null)?.html || '') as string
  const base = g.url || inicio
  const host = new URL(base).host.replace(/^www\./, '')
  const links = [...new Set([...html.matchAll(/href=["']([^"'#]+)["']/g)].map((m) => { try { return new URL(m[1].replace(/&amp;/g, '&'), base).toString() } catch { return '' } }))]
    .filter((u) => u && re.test(u) && new URL(u).host.replace(/^www\./, '') === host)
    .slice(0, max)
  for (const [i, u] of links.entries()) await gravarHtml(fonte, `link-${i + 1}`, u)
}

/** Centro-Oeste (Fase 6): pesquisa de proposições da ALMT; páginas de proposições da Alego e da ALEMS. */
const PASSOS_CO: Passo[] = [
  {
    fonte: 'almt',
    nome: 'proposicoes',
    async rodar() {
      const base = 'https://www.al.mt.gov.br/proposicao'
      const lista = await gravarHtml('almt', 'proposicoes', base)
      const html = ((lista.corpo as { html?: string } | null)?.html || '') as string
      // Valor do tipo "Projeto de lei" no formulário de pesquisa
      const tipo = /<option value="([^"]+)"[^>]*>\s*Projeto de lei\s*<\/option>/i.exec(html)?.[1] || ''
      const q = (o: Record<string, string>) =>
        `${base}?${new URLSearchParams(Object.fromEntries(Object.entries(o).map(([k, v]) => [`almt_form_proposicao_search_proposicao[${k}]`, v]))).toString()}`
      const ano = String(new Date().getFullYear())
      await gravarHtml('almt', 'proposicoes-pl-ano', q({ tipoPropositura: tipo, ano }))
      // Só as publicadas no Diário nos últimos 7 dias; uma proposta pelo número; andamentos e emendas de uma proposta
      const br = (d: Date) => d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
      const periodo = await gravarHtml('almt', 'proposicoes-periodo', q({ tipoPropositura: tipo, dataPublicacaoInicio: br(new Date(Date.now() - 7 * 864e5)) }))
      await gravarHtml('almt', 'proposicoes-numero', q({ tipoPropositura: tipo, numeroPropositura: '1', ano }))
      const hp = ((periodo.corpo as { html?: string } | null)?.html || '') as string
      const ids = [...new Set([...`${hp}${html}`.matchAll(/\/proposicao\/(\d+)\/tramitacoes/g)].map((m) => m[1]))].slice(0, 2)
      for (const id of ids) await gravarHtml('almt', `tramitacoes-${id}`, `${base}/${id}/tramitacoes`)
      if (ids[0]) await gravarHtml('almt', `emendas-${ids[0]}`, `${base}/${ids[0]}/emendas-e-substitutivos`)
      await gravarHtml('almt', 'diario-oficial', 'http://diariooficial.al.mt.gov.br/')
    },
  },
  {
    fonte: 'alego',
    nome: 'portal',
    async rodar() {
      await gravarComLinks('alego', 'https://portal.al.go.leg.br/', /proposi|processo|projeto|legislativ|materia|tramit/i)
    },
  },
  {
    fonte: 'alems',
    nome: 'portal',
    async rodar() {
      // SGPL público (aplicação Angular): a página e os scripts, para ver as chamadas da busca e quais pedem o desafio
      const base = 'https://sgpl.consulta.al.ms.gov.br/sgpl-publico/'
      const g = await gravarHtml('alems', 'sgpl-index', base)
      const html = ((g.corpo as { html?: string } | null)?.html || '') as string
      const scripts = [...html.matchAll(/<script[^>]+src="([^"]+\.js)"/g)].map((m) => new URL(m[1], base).toString()).filter((u) => /main|app|chunk|scripts/i.test(u)).slice(0, 3)
      for (const [i, u] of scripts.entries()) await gravarHtml('alems', `sgpl-js-${i + 1}`, u)
      await salvar('alems', 'sgpl-tipos', await buscar('https://sgpl.consulta.al.ms.gov.br/sgpl/sgpl-api/public/tipoProposicao'))
    },
  },
]

/** Sudeste (Fase 6): API de dados abertos da ALMG, arquivos de dados abertos da Alesp, consulta da Alerj. */
const PASSOS_SE: Passo[] = [
  {
    fonte: 'almg',
    nome: 'api',
    async rodar() {
      const api = 'https://dadosabertos.almg.gov.br'
      const ano = new Date().getFullYear()
      const d = `${api}/ws/proposicoes/pesquisa/direcionada?formato=json`
      // tp = tamanho da página (confirmado); p = página?; num = número?; outros tipos
      const candidatos: [string, string][] = [
        ['pl-ano', `${d}&tipo=PL&ano=${ano}&tp=20`],
        ['pl-ano-p2', `${d}&tipo=PL&ano=${ano}&tp=20&p=2`],
        ['pl-numero', `${d}&tipo=PL&num=6187&ano=${ano}`],
        ['plc-ano', `${d}&tipo=PLC&ano=${ano}&tp=5`],
        ['pec-ano', `${d}&tipo=PEC&ano=${ano}&tp=5`],
        ['pl-data', `${d}&tipo=PL&dataInicial=${ano}-10-10&tp=5`],
      ]
      for (const [nome, url] of candidatos) await gravarHtml('almg', nome, url)
    },
  },
  {
    fonte: 'alesp',
    nome: 'dados-abertos',
    async rodar() {
      // API da aplicação (legis-api-portal-prd), achada com o navegador: pesquisa de processos e ficha
      const api = 'https://legis-api-portal-prd.al.sp.gov.br'
      const ano = new Date().getFullYear()
      const tipos = 'listaIdTipoProcesso=1&listaIdTipoProcesso=2&listaIdTipoProcesso=5&listaIdTipoProcesso=4'
      await salvar('alesp', 'processos', await buscar(`${api}/processo?page=0&size=20&sort=desc&flPropositura=true&ano=${ano}&${tipos}`))
      await salvar('alesp', 'processos-numero', await buscar(`${api}/processo?page=0&size=10&sort=desc&flPropositura=true&listaIdTipoProcesso=1&numero=863&ano=${ano}`))
      await salvar('alesp', 'processo-detalhes', await buscar(`${api}/processo/detalhes/principais/1100004484`))
      await salvar('alesp', 'processo-tramitacoes', await buscar(`${api}/processo/tramitacoes/1100004484?page=0&size=50&sort=asc`))
      // O arquivo de proposituras (proposituras.zip: 17 MB, XML de 132 MB, sem ordem) fica de fora: pesado para 4 vezes ao dia
    },
  },
  {
    fonte: 'alerj',
    nome: 'proposicoes',
    async rodar() {
      const ln = 'http://alerjln1.alerj.rj.gov.br/scpro2327.nsf'
      const lista = await gravarHtml('alerj', 'lei-int', `${ln}/Internet/LeiInt?OpenForm&Start=1&Count=60`)
      const lh = ((lista.corpo as { html?: string } | null)?.html || '') as string
      const det = /href="(\/scpro2327\.nsf\/[0-9a-f]+\/[0-9a-f]+\?OpenDocument)"/.exec(lh)?.[1]
      if (det) await gravarHtml('alerj', 'detalhe', `http://alerjln1.alerj.rj.gov.br${det}`)
      await gravarHtml('alerj', 'pesquisa', `${ln}/18c1dd68f96be3e7832566ec0018d833/$searchForm?SearchView`)
    },
  },
]

/** Pará e Roraima sem SAPL aberto: Diário da ALE-RR (WordPress + PDF) e Banco de Leis da Alepa (API JSON). */
const PASSOS_NORTE: Passo[] = [
  {
    fonte: 'alerr',
    nome: 'diario',
    async rodar() {
      const base = 'https://diarios.al.rr.leg.br'
      const g = await salvar('alerr', 'midia', await buscar(`${base}/wp-json/wp/v2/media?per_page=20&mime_type=application/pdf&orderby=date&order=desc`))
      const lista = Array.isArray(g.corpo) ? (g.corpo as { source_url?: string }[]) : []
      // Edições recentes e a 4747 (13/10/2026), que traz 32 menções a projetos de lei
      const urls = [...new Set([`${base}/wp-content/uploads/2026/10/DIARIO-ALE-RR-ED.-4747-13.10.2026.pdf`, ...lista.slice(0, 3).map((m) => m.source_url).filter((u): u is string => !!u)])]
      for (const url of urls) {
        try {
          const r = await obter(url, { tentativas: 2, esperaBaseMs: 1500, tempoLimiteMs: 60_000 })
          const buf = Buffer.from(await r.arrayBuffer())
          const nome = (url.match(/ED\.-(\d+)/)?.[1] || 'edicao').replace(/\D/g, '')
          await writeFile(path.join(saida, 'alerr', `ed-${nome}.pdf`), buf)
          console.log(`✅ alerr/ed-${nome}.pdf · ${Math.round(buf.length / 1024)} KB`)
        } catch (e) {
          console.log(`⚠️ alerr ${url} · ${(e as Error).message}`)
        }
      }
    },
  },
  {
    fonte: 'alepa',
    nome: 'banco-de-leis',
    async rodar() {
      const api = 'https://bancodeleis.alepa.pa.gov.br/api/leis.php'
      await salvar('alepa', 'leis-2026', await buscar(`${api}?ano=${new Date().getFullYear()}`, 60))
      await salvar('alepa', 'leis-ambiental', await buscar(`${api}?q=ambiental`, 60))
      await salvar('alepa', 'leis-numero', await buscar(`${api}?numero=5887`, 60))
      await salvar('alepa', 'api-doc', await buscar('https://bancodeleis.alepa.pa.gov.br/api.php'))
      await salvar('alepa', 'tipos-proposicao', await buscar('https://www.alepa.pa.gov.br/Legislativo/GetTipoProposicoes'))
      // Página de detalhes (andamentos): projeto de licenciamento (647/2026) e APA Bacajaí (461/2026)
      const tipo = encodeURIComponent('PROJETO DE LEI ORDINÁRIA')
      for (const [nome, id, url] of [
        ...[16347, 16099, 16375].map((id) => [`detalhes-${id}`, id, `https://www.alepa.pa.gov.br/Legislativo/DetalhesProposicao?IdProposicao=${id}&tipo=${tipo}&situacao=0&decisao=-1&veto=-1`] as const),
        // Só com o id (como o conector chamava): para comparar
        ['detalhes-16347-so-id', 16347, 'https://www.alepa.pa.gov.br/Legislativo/DetalhesProposicao?IdProposicao=16347'] as const,
      ]) {
        void id
        const gravadaEm = new Date().toISOString()
        try {
          const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36' }, signal: AbortSignal.timeout(45_000) })
          const html = await r.text()
          // A página inteira (o painel DevExpress fica no fim); só os scripts da biblioteca saem
          await salvar('alepa', nome, { url, status: r.status, tipo: r.headers.get('content-type') || '', gravadaEm, corpo: { html: html.replace(/<script[^>]*src="\/DXR\.axd[^"]*"[^>]*><\/script>/g, '').slice(0, 400_000) } })
        } catch (e) {
          await salvar('alepa', nome, { url, status: null, tipo: '', gravadaEm, corpo: null, erro: (e as Error).message })
        }
      }
      // Lista de proposições (painel DevExpress): POST direto, sem navegador, com variações do campo de tipo
      const ano = new Date().getFullYear()
      const variacoes: Record<string, Record<string, string>> = {
        'proposicoes-ano': {},
        'proposicoes-tipo-IdTipoProposicao': { 'model[IdTipoProposicao]': '3' },
        'proposicoes-tipo-IdTipo': { 'model[IdTipo]': '3' },
        'proposicoes-tipo-TipoProposicao': { 'model[TipoProposicao]': '3' },
        'proposicoes-tipo-ComboBox': { ComboBoxTipoProposicao_VI: '3', 'model[ComboBoxTipoProposicao]': '3' },
        'proposicoes-texto-ambiental': { 'model[Texto]': 'ambiental' },
      }
      for (const [nome, extra] of Object.entries(variacoes)) {
        const corpo = new URLSearchParams({ DXCallbackName: 'cbpProposicoes', __DXCallbackArgument: 'c0:[object Object]', 'model[Numero]': '', 'model[Ano]': String(ano), 'model[IdAutor]': '', 'model[Texto]': '', ...extra })
        const gravadaEm = new Date().toISOString()
        try {
          const r = await fetch('https://www.alepa.pa.gov.br/Legislativo/CallbackPanelProposicoes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest', 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36' },
            body: corpo.toString(),
            signal: AbortSignal.timeout(45_000),
          })
          const texto = await r.text()
          const total = /(\d+) Resultados/.exec(texto)?.[1]
          await salvar('alepa', nome, { url: `POST CallbackPanelProposicoes ${JSON.stringify(extra)}`, status: r.status, tipo: r.headers.get('content-type') || '', gravadaEm, corpo: { total, html: texto.slice(0, 60_000) } })
        } catch (e) {
          await salvar('alepa', nome, { url: 'POST CallbackPanelProposicoes', status: null, tipo: '', gravadaEm, corpo: null, erro: (e as Error).message })
        }
      }
    },
  },
]

const PASSOS: Passo[] = [
  // ---------------- Câmara ----------------
  {
    fonte: 'camara',
    nome: 'proposicoes-tema48',
    async rodar(ctx) {
      const g = await salvar('camara', 'proposicoes-tema48', await buscar(`${CAMARA}/proposicoes?codTema=48&dataInicio=${dia(-5)}&dataFim=${dia()}&itens=100&ordem=DESC&ordenarPor=id`))
      const l = (dados(g) as { id: number; siglaTipo: string }[]) || []
      ctx.camaraRecente = l.find((p) => ['PL', 'PLP', 'PEC', 'MPV', 'PDL'].includes(p.siglaTipo))?.id ?? l[0]?.id
    },
  },
  {
    fonte: 'camara',
    nome: 'proposicoes-palavra',
    async rodar() {
      await salvar('camara', 'proposicoes-palavra', await buscar(`${CAMARA}/proposicoes?keywords=${encodeURIComponent('licenciamento ambiental')}&dataInicio=${dia(-60)}&dataFim=${dia()}&itens=30&ordem=DESC&ordenarPor=id`))
    },
  },
  {
    fonte: 'camara',
    nome: 'pl3729-busca',
    async rodar(ctx) {
      const g = await salvar('camara', 'pl3729-busca', await buscar(`${CAMARA}/proposicoes?siglaTipo=PL&numero=3729&ano=2004`))
      ctx.camaraLic = ((dados(g) as { id: number }[]) || [])[0]?.id ?? 257161
    },
  },
  ...['', '/autores', '/tramitacoes', '/temas', '/relacionadas', '/votacoes'].map(
    (sufixo): Passo => ({
      fonte: 'camara',
      nome: `pl3729${sufixo.replace('/', '-') || '-ficha'}`,
      async rodar(ctx) {
        const g = await salvar('camara', `pl3729${sufixo.replace('/', '-') || '-ficha'}`, await buscar(`${CAMARA}/proposicoes/${ctx.camaraLic}${sufixo}`, sufixo === '/tramitacoes' ? 400 : CORTE))
        if (sufixo === '/votacoes') {
          // Uma votação nominal (com placar na descrição), para gravar os votos individuais
          const v = ((dados(g) as { id: string; siglaOrgao: string; descricao?: string }[]) || []).filter((x) => x.siglaOrgao === 'PLEN')
          ctx.camaraVotacao = v.find((x) => /Sim: \d+/.test(x.descricao || ''))?.id ?? v[0]?.id
        }
      },
    }),
  ),
  ...['', '/votos', '/orientacoes'].map(
    (sufixo): Passo => ({
      fonte: 'camara',
      nome: `votacao${sufixo.replace('/', '-') || '-detalhe'}`,
      async rodar(ctx) {
        if (!ctx.camaraVotacao) return
        const g = await salvar('camara', `votacao${sufixo.replace('/', '-') || '-detalhe'}`, await buscar(`${CAMARA}/votacoes/${ctx.camaraVotacao}${sufixo}`, 600))
        if (sufixo === '/votos') ctx.camaraDeputado = ((dados(g) as { deputado_?: { id: number } }[]) || [])[0]?.deputado_?.id
      },
    }),
  ),
  {
    fonte: 'camara',
    nome: 'deputado',
    async rodar(ctx) {
      if (ctx.camaraDeputado) await salvar('camara', 'deputado', await buscar(`${CAMARA}/deputados/${ctx.camaraDeputado}`))
    },
  },
  ...['', '/autores', '/tramitacoes'].map(
    (sufixo): Passo => ({
      fonte: 'camara',
      nome: `recente${sufixo.replace('/', '-') || '-ficha'}`,
      async rodar(ctx) {
        if (!ctx.camaraRecente) return
        const g = await salvar('camara', `recente${sufixo.replace('/', '-') || '-ficha'}`, await buscar(`${CAMARA}/proposicoes/${ctx.camaraRecente}${sufixo}`))
        if (!sufixo) ctx.camaraRecenteTeor = (dados(g) as { urlInteiroTeor?: string } | null)?.urlInteiroTeor
      },
    }),
  ),
  {
    fonte: 'camara',
    nome: 'eventos',
    async rodar(ctx) {
      const g = await salvar('camara', 'eventos', await buscar(`${CAMARA}/eventos?dataInicio=${dia(-2)}&dataFim=${dia(7)}&itens=100&ordem=ASC&ordenarPor=dataHoraInicio`, 100))
      ctx.camaraEventos = ((dados(g) as { id: number; descricaoTipo?: string }[]) || []).filter((e) => /deliberativ/i.test(e.descricaoTipo || '')).map((e) => e.id)
    },
  },
  {
    fonte: 'camara',
    nome: 'pauta',
    async rodar(ctx) {
      for (const id of ((ctx.camaraEventos as number[]) || []).slice(0, 12)) {
        const g = await buscar(`${CAMARA}/eventos/${id}/pauta`)
        if (((dados(g) as unknown[]) || []).length) {
          await salvar('camara', 'pauta', g)
          await salvar('camara', 'pauta-evento', await buscar(`${CAMARA}/eventos/${id}`))
          return
        }
      }
      console.log('⚠️ camara/pauta · nenhum evento deliberativo com pauta publicada')
    },
  },
  ...['codSituacao', 'codTipoTramitacao', 'codRegime', 'siglaTipo'].map(
    (ref): Passo => ({
      fonte: 'camara',
      nome: `ref-${ref}`,
      async rodar() {
        await salvar('camara', `ref-${ref}`, await buscar(`${CAMARA}/referencias/proposicoes/${ref}`, 2000))
      },
    }),
  ),

  // ---------------- Senado ----------------
  {
    fonte: 'senado',
    nome: 'especificacao',
    async rodar() {
      const g = await buscar(`${SENADO}/v3/api-docs`, 100_000)
      if (g.corpo && typeof g.corpo === 'object') {
        g.corpo = filtrarEspecificacao(g.corpo as Record<string, unknown>, /processo|votacao|agenda|plenario\/resultado|vetos|senador\/\{codigo\}$|senador\/lista\/atual/i)
      }
      await salvar('senado', 'especificacao', g)
    },
  },
  {
    fonte: 'senado',
    nome: 'processo-busca',
    async rodar(ctx) {
      const g = await salvar('senado', 'processo-busca', await buscar(`${SENADO}/processo?sigla=PL&numero=2159&ano=2021`))
      const p = primeiraLista(g.corpo)[0] || {}
      ctx.senadoProcesso = p.id ?? p.idProcesso ?? p.codigo
      ctx.senadoMateria = p.codigoMateria ?? p.codigo_materia
    },
  },
  {
    fonte: 'senado',
    nome: 'processo-detalhe',
    async rodar(ctx) {
      if (!ctx.senadoProcesso) return
      const g = await salvar('senado', 'processo-detalhe', await buscar(`${SENADO}/processo/${ctx.senadoProcesso}`, 400))
      const c = g.corpo as Record<string, unknown> | null
      ctx.senadoMateria ??= c?.codigoMateria
    },
  },
  ...(['documento', 'emenda', 'relatoria', 'prazo'] as const).map(
    (s): Passo => ({
      fonte: 'senado',
      nome: `processo-${s}`,
      async rodar(ctx) {
        if (!ctx.senadoProcesso) return
        await salvar('senado', `processo-${s}`, await buscar(`${SENADO}/processo/${s}?idProcesso=${ctx.senadoProcesso}`))
      },
    }),
  ),
  {
    fonte: 'senado',
    nome: 'processo-recentes',
    async rodar() {
      // "numdias": atualizados nos últimos N dias (máximo 30), segundo a especificação
      await salvar('senado', 'processo-atualizados', await buscar(`${SENADO}/processo?numdias=2&tramitando=S`, 60))
      await salvar('senado', 'processo-assunto-meio-ambiente', await buscar(`${SENADO}/processo?codAssuntoEspecifico=146&tramitando=S&numdias=30`, 60))
      await salvar('senado', 'processo-termo', await buscar(`${SENADO}/processo?termo=ambiental&tramitando=S&numdias=30`, 60))
      for (const ref of ['tipos-situacao', 'tipos-atualizacao', 'assuntos', 'siglas']) await salvar('senado', `ref-${ref}`, await buscar(`${SENADO}/processo/${ref}`, 2000))
    },
  },
  {
    fonte: 'senado',
    nome: 'votacao',
    async rodar(ctx) {
      await salvar('senado', 'votacao-periodo', await buscar(`${SENADO}/votacao?dataInicio=${dia(-30)}&dataFim=${dia()}`, 20))
      if (ctx.senadoProcesso) await salvar('senado', 'votacao-processo', await buscar(`${SENADO}/votacao?idProcesso=${ctx.senadoProcesso}`, 600))
    },
  },
  {
    fonte: 'senado',
    nome: 'agenda',
    async rodar() {
      await salvar('senado', 'agenda-plenario-mes', await buscar(`${SENADO}/plenario/agenda/mes/${compacto(dia())}`))
      await salvar('senado', 'agenda-comissoes', await buscar(`${SENADO}/comissao/agenda/${compacto(dia())}/${compacto(dia(7))}`))
    },
  },
  {
    fonte: 'senado',
    nome: 'vetos',
    async rodar() {
      await salvar('senado', 'vetos-ano', await buscar(`${SENADO}/materia/vetos/${new Date().getFullYear()}`))
    },
  },
  {
    fonte: 'vetos',
    nome: 'veto-resultado',
    async rodar() {
      // Um veto já apreciado (para o resultado) e a agenda do Congresso
      const g = await buscar(`${SENADO}/materia/vetos/${new Date().getFullYear()}`, 1000)
      const vetos = primeiraLista(g.corpo) as { Materia?: { Codigo?: string; EmTramitacao?: string }; Codigo?: string }[]
      const apreciado = vetos.find((v) => v.Materia?.EmTramitacao === 'Não') || vetos[vetos.length - 1]
      if (apreciado?.Materia?.Codigo) {
        await salvar('senado', 'veto-resultado-materia', await buscar(`${SENADO}/plenario/resultado/veto/materia/${apreciado.Materia.Codigo}`))
        await salvar('senado', 'veto-processo-busca', await buscar(`${SENADO}/processo?codigoMateria=${apreciado.Materia.Codigo}`))
      }
      await salvar('senado', 'agenda-congresso', await buscar(`${SENADO}/plenario/agenda/cn/${compacto(dia(-20))}/${compacto(dia(10))}`))
    },
  },
  // ---------------- PDFs (texto integral) ----------------
  {
    fonte: 'pdf',
    nome: 'pdfs',
    async rodar(ctx) {
      await mkdir(path.join(saida, 'pdf'), { recursive: true })
      const urls: [string, string | undefined][] = [
        ['camara-recente', (ctx.camaraRecenteTeor as string | undefined) || 'https://www.camara.leg.br/proposicoesWeb/prop_mostrarintegra?codteor=3182478'],
        ['senado-documento', 'https://legis.senado.gov.br/sdleg-getter/dadosabertos/documento/d663bfce-d4fd-442c-b44f-6c337bf5ba5e'],
      ]
      for (const [nome, url] of urls) {
        if (!url) continue
        try {
          const r = await obter(url, { tentativas: 3, tempoLimiteMs: 60_000 })
          const buf = Buffer.from(await r.arrayBuffer())
          await writeFile(path.join(saida, 'pdf', `${nome}.pdf`), buf)
          console.log(`✅ pdf/${nome} · ${r.headers.get('content-type')} · ${Math.round(buf.length / 1024)} KB · começa com ${buf.subarray(0, 5).toString()}`)
        } catch (e) {
          console.log(`⚠️ pdf/${nome} · ${(e as Error).message}`)
        }
      }
    },
  },
  // ---------------- DOU (INLABS) ----------------
  {
    fonte: 'dou',
    nome: 'inlabs',
    async rodar() {
      const email = process.env.INLABS_EMAIL
      const senha = process.env.INLABS_SENHA
      await mkdir(path.join(saida, 'dou'), { recursive: true })
      const relatorio: Record<string, unknown> = { gravadoEm: new Date().toISOString() }
      if (!email || !senha) {
        relatorio.erro = 'sem os segredos INLABS_EMAIL e INLABS_SENHA'
        console.log('⚠️ dou · sem os segredos INLABS_EMAIL e INLABS_SENHA')
        await writeFile(path.join(saida, 'dou', 'relatorio.json'), JSON.stringify(relatorio, null, 2) + '\n')
        return
      }
      try {
        const cookie = await entrarInlabs(email, senha)
        relatorio.login = 'ok'
        for (let n = 0; n < 7; n++) {
          const data = dia(-n)
          const zip = await baixarEdicao(cookie, data, 'DO1')
          if (!zip) continue
          const xmls = lerZip(zip, (nome) => nome.toLowerCase().endsWith('.xml'))
          const tipos: Record<string, number> = {}
          const escolhidos: { nome: string; xml: string }[] = []
          const porTipo: Record<string, number> = {}
          for (const a of xmls) {
            const xml = a.conteudo.toString('utf8')
            const tipo = /artType="([^"]*)"/.exec(xml)?.[1] || '?'
            const categoria = /artCategory="([^"]*)"/.exec(xml)?.[1] || ''
            tipos[tipo] = (tipos[tipo] || 0) + 1
            const interessa =
              /^(Lei|Lei Complementar|Decreto|Medida Provis[óo]ria|Mensagem|Decreto Legislativo)$/i.test(tipo) ||
              (/Meio Ambiente|Ibama|Chico Mendes|Servi[çc]o Florestal|[ÁA]guas/i.test(categoria) && /Portaria|Instru[çc][ãa]o Normativa|Resolu[çc][ãa]o/i.test(tipo))
            porTipo[tipo] = porTipo[tipo] || 0
            if ((interessa && porTipo[tipo] < 8) || escolhidos.length < 3) {
              porTipo[tipo]++
              escolhidos.push({ nome: a.nome, xml })
            }
          }
          relatorio.data = data
          relatorio.secao = 'DO1'
          relatorio.tamanhoZip = zip.length
          relatorio.arquivos = xmls.length
          relatorio.tipos = tipos
          relatorio.gravados = escolhidos.map((e) => e.nome)
          for (const e of escolhidos.slice(0, 60)) await writeFile(path.join(saida, 'dou', e.nome.replace(/[^\w.-]/g, '_')), e.xml)
          // Edição extra do mesmo dia, se houver
          const extra = await baixarEdicao(cookie, data, 'DO1E')
          relatorio.extra = extra ? lerZip(extra, (nome) => nome.toLowerCase().endsWith('.xml')).length : 0
          break
        }
        console.log(`✅ dou · ${JSON.stringify({ data: relatorio.data, arquivos: relatorio.arquivos, extra: relatorio.extra })}`)
      } catch (e) {
        relatorio.erro = (e as Error).message
        console.log(`❌ dou · ${(e as Error).message}`)
      }
      await writeFile(path.join(saida, 'dou', 'relatorio.json'), JSON.stringify(relatorio, null, 2) + '\n')
    },
  },
]

async function main() {
  const ctx: Ctx = {}
  await mkdir(saida, { recursive: true })
  const fontes = filtro ? filtro.split(',') : null
  for (const p of [...PASSOS, ...PASSOS_SAPL, ...passosSapl('sapl-ne', SAPL_NE), ...PASSOS_NORTE, ...PASSOS_NE, ...PASSOS_CO, ...PASSOS_SE].filter((x) => !fontes || fontes.includes(x.fonte))) {
    try {
      await p.rodar(ctx)
    } catch (e) {
      console.log(`❌ ${p.fonte}/${p.nome} · ${(e as Error).message}`)
    }
  }
  await writeFile(path.join(saida, 'contexto.json'), JSON.stringify({ gravadoEm: new Date().toISOString(), ...ctx }, null, 2) + '\n')
}

if (process.argv[1]?.includes('amostras')) main()
