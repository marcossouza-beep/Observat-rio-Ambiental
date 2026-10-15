/**
 * Grava respostas reais das APIs usadas pelos conectores, para os testes rodarem sem rede.
 * Roda no GitHub Actions (.github/workflows/amostras.yml), que salva o resultado em
 * tests/fixtures/coleta/ no próprio repositório.
 *
 * Uso: pnpm amostras            (todas)
 *      pnpm amostras senado     (só as do Senado)
 *
 * Listas longas são cortadas (ver CORTE) para os arquivos ficarem pequenos.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { ErroHttp, obter } from '../http'

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
        if (ctx.camaraRecente) await salvar('camara', `recente${sufixo.replace('/', '-') || '-ficha'}`, await buscar(`${CAMARA}/proposicoes/${ctx.camaraRecente}${sufixo}`))
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
]

async function main() {
  const ctx: Ctx = {}
  await mkdir(saida, { recursive: true })
  for (const p of PASSOS.filter((x) => !filtro || x.fonte === filtro)) {
    try {
      await p.rodar(ctx)
    } catch (e) {
      console.log(`❌ ${p.fonte}/${p.nome} · ${(e as Error).message}`)
    }
  }
  await writeFile(path.join(saida, 'contexto.json'), JSON.stringify({ gravadoEm: new Date().toISOString(), ...ctx }, null, 2) + '\n')
}

if (process.argv[1]?.includes('amostras')) main()
