/**
 * Teste de fumaça das APIs (docs/APIS.md, seção 6).
 * Cada verificação chama uma fonte real, guarda uma amostra da resposta e diz o que encontrou.
 * "Essencial" = se falhar, o teste falha (a coleta federal depende disso).
 */
import { obter, obterJson } from '../http'

export type Resultado = { ok: boolean; notas: string[]; amostra?: unknown; contexto?: Record<string, unknown> }
export type Verificacao = {
  id: string
  fonte: string
  descricao: string
  essencial?: boolean
  rodar: (ctx: Record<string, unknown>) => Promise<Resultado>
}

const CAMARA = 'https://dadosabertos.camara.leg.br/api/v2'
const SENADO = 'https://legis.senado.leg.br/dadosabertos'
const hoje = () => new Date().toISOString().slice(0, 10)
const diasAtras = (n: number) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10)
const diasAFrente = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10)
const semHifen = (d: string) => d.replace(/-/g, '')
const rapido = { tentativas: 2, esperaBaseMs: 1500, tempoLimiteMs: 40_000 }

type Camara<T> = { dados: T; links?: { rel: string; href: string }[] }

/** "fetch failed" esconde a causa real (TLS, DNS, conexão); mostra a causa. */
export function descreverErro(e: unknown): string {
  const err = e as Error & { cause?: { code?: string; message?: string } }
  const causa = err.cause ? ` (${err.cause.code || ''} ${err.cause.message || ''})`.replace(/\s+\)/, ')') : ''
  return `${err.message}${causa}`
}

async function textoCurto(url: string, headers: Record<string, string> = {}) {
  const r = await obter(url, { ...rapido, headers })
  const tipo = r.headers.get('content-type') || ''
  const corpo = await r.text()
  return { status: r.status, tipo, corpo, tamanho: corpo.length }
}

export const VERIFICACOES: Verificacao[] = [
  // ---------------- Câmara ----------------
  {
    id: 'camara-proposicoes',
    fonte: 'Câmara',
    descricao: 'Busca de PLs de 2026 com a palavra "ambiental"',
    essencial: true,
    async rodar() {
      const r = await obterJson<Camara<{ id: number; siglaTipo: string; numero: number; ano: number; ementa: string }[]>>(
        `${CAMARA}/proposicoes?siglaTipo=PL&ano=2026&keywords=ambiental&itens=10&ordem=DESC&ordenarPor=id`,
        rapido,
      )
      const n = r.dados?.length ?? 0
      return {
        ok: n > 0,
        notas: [`${n} proposições na primeira página`, `paginação: ${r.links?.some((l) => l.rel === 'next') ? 'sim' : 'não'}`],
        amostra: r,
        contexto: { idProposicao: r.dados?.[0]?.id },
      }
    },
  },
  {
    id: 'camara-proposicao-detalhe',
    fonte: 'Câmara',
    descricao: 'Ficha, autores, tramitações e temas de uma proposição',
    essencial: true,
    async rodar(ctx) {
      const id = ctx.idProposicao
      if (!id) return { ok: false, notas: ['sem proposição da verificação anterior'] }
      const ficha = await obterJson<Camara<Record<string, unknown> & { statusProposicao?: Record<string, unknown>; urlInteiroTeor?: string }>>(`${CAMARA}/proposicoes/${id}`, rapido)
      const autores = await obterJson<Camara<unknown[]>>(`${CAMARA}/proposicoes/${id}/autores`, rapido)
      const tram = await obterJson<Camara<unknown[]>>(`${CAMARA}/proposicoes/${id}/tramitacoes`, rapido)
      const temas = await obterJson<Camara<unknown[]>>(`${CAMARA}/proposicoes/${id}/temas`, rapido)
      const campos = Object.keys(ficha.dados || {})
      const status = Object.keys(ficha.dados?.statusProposicao || {})
      return {
        ok: campos.includes('ementa') && !!ficha.dados?.statusProposicao,
        notas: [
          `campos da ficha: ${campos.join(', ')}`,
          `campos de statusProposicao: ${status.join(', ')}`,
          `inteiro teor: ${ficha.dados?.urlInteiroTeor || 'ausente'}`,
          `${autores.dados?.length ?? 0} autores · ${tram.dados?.length ?? 0} tramitações · ${temas.dados?.length ?? 0} temas`,
        ],
        amostra: { ficha, autores, tramitacoes: tram.dados?.slice(-5), temas },
        contexto: { urlInteiroTeor: ficha.dados?.urlInteiroTeor },
      }
    },
  },
  {
    id: 'camara-inteiro-teor',
    fonte: 'Câmara',
    descricao: 'Download do inteiro teor (PDF)',
    async rodar(ctx) {
      const url = ctx.urlInteiroTeor as string | undefined
      if (!url) return { ok: false, notas: ['sem link de inteiro teor'] }
      const r = await obter(url, rapido)
      const tipo = r.headers.get('content-type') || ''
      const buf = Buffer.from(await r.arrayBuffer())
      return { ok: buf.length > 1000, notas: [`tipo: ${tipo}`, `tamanho: ${Math.round(buf.length / 1024)} KB`, `começa com: ${buf.subarray(0, 5).toString()}`] }
    },
  },
  {
    id: 'camara-votacoes-votos',
    fonte: 'Câmara',
    descricao: 'Votações de plenário recentes e votos individuais (risco: votos vazios desde 2024)',
    essencial: true,
    async rodar() {
      const v = await obterJson<Camara<{ id: string; siglaOrgao: string; dataHoraRegistro?: string; descricao?: string }[]>>(
        `${CAMARA}/votacoes?dataInicio=${diasAtras(80)}&dataFim=${hoje()}&itens=100&ordem=DESC&ordenarPor=dataHoraRegistro`,
        rapido,
      )
      const plen = (v.dados || []).filter((x) => x.siglaOrgao === 'PLEN')
      const notas = [`${v.dados?.length ?? 0} votações nos últimos 80 dias; ${plen.length} no Plenário`]
      const amostras: Record<string, unknown> = { votacoes: v.dados?.slice(0, 5) }
      let comVotos = 0
      for (const x of plen.slice(0, 5)) {
        const votos = await obterJson<Camara<unknown[]>>(`${CAMARA}/votacoes/${x.id}/votos`, rapido)
        const n = votos.dados?.length ?? 0
        if (n > 0) comVotos++
        notas.push(`votação ${x.id} (${x.dataHoraRegistro?.slice(0, 10)}): ${n} votos individuais`)
        if (!amostras.votos && n) amostras.votos = votos.dados?.slice(0, 3)
      }
      if (plen[0]) amostras.orientacoes = await obterJson(`${CAMARA}/votacoes/${plen[0].id}/orientacoes`, rapido)
      notas.push(comVotos ? `CONFIRMADO: votos individuais disponíveis (${comVotos} de ${Math.min(5, plen.length)})` : 'ATENÇÃO: nenhuma votação recente com votos individuais')
      return { ok: (v.dados?.length ?? 0) > 0, notas, amostra: amostras }
    },
  },
  {
    id: 'camara-eventos-pauta',
    fonte: 'Câmara',
    descricao: 'Eventos dos próximos 7 dias e pauta de um deles',
    async rodar() {
      const e = await obterJson<Camara<{ id: number; descricaoTipo?: string; orgaos?: { sigla: string }[] }[]>>(
        `${CAMARA}/eventos?dataInicio=${hoje()}&dataFim=${diasAFrente(7)}&itens=50&ordem=ASC&ordenarPor=dataHoraInicio`,
        rapido,
      )
      const n = e.dados?.length ?? 0
      const notas = [`${n} eventos nos próximos 7 dias`]
      let pauta: unknown
      for (const ev of (e.dados || []).slice(0, 8)) {
        const p = await obterJson<Camara<unknown[]>>(`${CAMARA}/eventos/${ev.id}/pauta`, rapido)
        if ((p.dados?.length ?? 0) > 0) {
          pauta = p.dados?.slice(0, 3)
          notas.push(`evento ${ev.id} (${ev.orgaos?.map((o) => o.sigla).join('/')}) tem ${p.dados?.length} itens de pauta`)
          break
        }
      }
      if (!pauta) notas.push('nenhuma pauta preenchida nos primeiros eventos (pode ser recesso ou pauta não publicada ainda)')
      return { ok: true, notas, amostra: { eventos: e.dados?.slice(0, 3), pauta } }
    },
  },
  {
    id: 'camara-temas',
    fonte: 'Câmara',
    descricao: 'Tabela de temas oficiais (procurar Meio Ambiente)',
    async rodar() {
      const t = await obterJson<Camara<{ cod: string; nome: string }[]>>(`${CAMARA}/referencias/proposicoes/codTema`, rapido)
      const amb = (t.dados || []).filter((x) => /ambient|agr|energ|minas|recursos h/i.test(x.nome))
      return { ok: (t.dados?.length ?? 0) > 0, notas: amb.map((x) => `tema ${x.cod}: ${x.nome}`), amostra: t.dados }
    },
  },
  {
    id: 'camara-arquivos',
    fonte: 'Câmara',
    descricao: 'Arquivos em massa por ano (carga histórica e plano B dos votos)',
    async rodar() {
      const ano = new Date().getFullYear()
      const notas: string[] = []
      let algum = false
      for (const nome of [`proposicoes/json/proposicoes-${ano}.json`, `votacoesVotos/json/votacoesVotos-${ano}.json`, `votacoes/json/votacoes-${ano}.json`]) {
        const url = `https://dadosabertos.camara.leg.br/arquivos/${nome}`
        try {
          const r = await obter(url, { ...rapido, tentativas: 1, headers: { Range: 'bytes=0-2047' } })
          algum = true
          notas.push(`${nome}: disponível (HTTP ${r.status}, ${r.headers.get('content-range') || r.headers.get('content-length') || 'tamanho n/d'}, atualizado ${r.headers.get('last-modified') || 'n/d'})`)
        } catch (e) {
          notas.push(`${nome}: ${(e as Error).message}`)
        }
      }
      return { ok: algum, notas }
    },
  },
  // ---------------- Senado ----------------
  {
    id: 'senado-docs',
    fonte: 'Senado',
    descricao: 'Índice da documentação: lista de serviços (procurar "processo")',
    essencial: true,
    async rodar() {
      const notas: string[] = []
      for (const url of [`${SENADO}/v3/api-docs`, `${SENADO}/api-docs`, `${SENADO}/v2/api-docs`, `${SENADO}/openapi.json`]) {
        try {
          const r = await textoCurto(url, { Accept: 'application/json' })
          const spec = JSON.parse(r.corpo) as { paths?: Record<string, unknown> }
          const caminhos = Object.keys(spec.paths || {})
          if (!caminhos.length) {
            notas.push(`${url.replace(SENADO, '')}: sem caminhos`)
            continue
          }
          const interesse = caminhos.filter((c) => /processo|votac|agenda|plenario|comissao|veto|emenda|texto|documento|relator|autor/i.test(c))
          notas.push(`especificação em ${url.replace(SENADO, '')}: ${caminhos.length} caminhos`, `de interesse: ${interesse.join(' · ')}`)
          return { ok: true, notas, amostra: spec }
        } catch (e) {
          notas.push(`${url.replace(SENADO, '')}: ${descreverErro(e)}`)
        }
      }
      const r = await textoCurto(`${SENADO}/docs/index.html`)
      notas.push(`docs/index.html: ${r.tamanho} bytes; início: ${r.corpo.replace(/\s+/g, ' ').slice(0, 300)}`)
      return { ok: r.tamanho > 500, notas, amostra: r.corpo.slice(0, 20_000) }
    },
  },
  {
    id: 'senado-processo',
    fonte: 'Senado',
    descricao: 'Serviço novo "processo": PL 2159/2021 (Lei Geral do Licenciamento)',
    essencial: true,
    async rodar() {
      const tentativas = [
        `${SENADO}/processo?sigla=PL&numero=2159&ano=2021`,
        `${SENADO}/processo.json?sigla=PL&numero=2159&ano=2021`,
        `${SENADO}/processo?identificacao=PL%202159/2021`,
      ]
      const notas: string[] = []
      for (const url of tentativas) {
        try {
          const r = await textoCurto(url, { Accept: 'application/json' })
          notas.push(`${url} → HTTP ${r.status}, ${r.tipo}, ${r.tamanho} bytes`)
          if (r.tamanho > 50) {
            let json: unknown = null
            try {
              json = JSON.parse(r.corpo)
            } catch {}
            const chaves = json && typeof json === 'object' ? Object.keys(Array.isArray(json) ? (json[0] as object) || {} : (json as object)) : []
            notas.push(`chaves: ${chaves.join(', ') || '(não é JSON)'}`)
            return { ok: true, notas, amostra: json ?? r.corpo.slice(0, 20_000) }
          }
        } catch (e) {
          notas.push(`${url} → ${(e as Error).message}`)
        }
      }
      return { ok: false, notas }
    },
  },
  {
    id: 'senado-materia-antigo',
    fonte: 'Senado',
    descricao: 'Serviço antigo "matéria" (ainda responde?)',
    async rodar() {
      const r = await textoCurto(`${SENADO}/materia/pesquisa/lista?sigla=PL&numero=2159&ano=2021`, { Accept: 'application/json' })
      const aviso = /descontinuad|deprecat|desativa/i.test(r.corpo) ? 'resposta traz aviso de descontinuação' : 'sem aviso de descontinuação no corpo'
      return { ok: r.tamanho > 50, notas: [`HTTP ${r.status}, ${r.tipo}, ${r.tamanho} bytes`, aviso], amostra: r.corpo.slice(0, 20_000) }
    },
  },
  {
    id: 'senado-agenda',
    fonte: 'Senado',
    descricao: 'Agenda do Plenário e das comissões (próximos dias)',
    async rodar() {
      const notas: string[] = []
      const amostra: Record<string, unknown> = {}
      for (const [nome, url] of [
        ['plenário (mês)', `${SENADO}/plenario/agenda/mes/${semHifen(hoje())}`],
        ['plenário (dia)', `${SENADO}/plenario/agenda/dia/${semHifen(hoje())}`],
        ['plenário (período)', `${SENADO}/plenario/agenda?dataInicio=${hoje()}&dataFim=${diasAFrente(7)}`],
        ['comissões', `${SENADO}/comissao/agenda/${semHifen(hoje())}/${semHifen(diasAFrente(7))}`],
      ] as const) {
        try {
          const r = await textoCurto(url, { Accept: 'application/json' })
          notas.push(`${nome}: HTTP ${r.status}, ${r.tamanho} bytes`)
          amostra[nome] = r.corpo.slice(0, 10_000)
        } catch (e) {
          notas.push(`${nome}: ${descreverErro(e)}`)
        }
      }
      return { ok: notas.some((n) => n.includes('HTTP 200')), notas, amostra }
    },
  },
  {
    id: 'senado-votacoes',
    fonte: 'Senado',
    descricao: 'Votações nominais recentes do Plenário',
    async rodar() {
      const notas: string[] = []
      for (const url of [
        `${SENADO}/votacao?dataInicio=${diasAtras(60)}&dataFim=${hoje()}`,
        `${SENADO}/plenario/lista/votacao/${semHifen(diasAtras(30))}/${semHifen(hoje())}`,
      ]) {
        try {
          const r = await textoCurto(url, { Accept: 'application/json' })
          notas.push(`${url.replace(SENADO, '')} → HTTP ${r.status}, ${r.tamanho} bytes`)
          if (r.tamanho > 200) return { ok: true, notas, amostra: r.corpo.slice(0, 20_000) }
        } catch (e) {
          notas.push(`${url.replace(SENADO, '')} → ${(e as Error).message}`)
        }
      }
      return { ok: false, notas }
    },
  },
  // ---------------- DOU, LexML, TSE, IBGE, Querido Diário ----------------
  {
    id: 'dou-inlabs',
    fonte: 'DOU (INLABS)',
    descricao: 'Login e download da Seção 1 do dia (precisa de INLABS_EMAIL e INLABS_SENHA)',
    async rodar() {
      const email = process.env.INLABS_EMAIL
      const senha = process.env.INLABS_SENHA
      const home = await textoCurto('https://inlabs.in.gov.br/')
      const notas = [`portal: HTTP ${home.status}, ${home.tamanho} bytes`]
      if (!email || !senha) return { ok: home.status === 200, notas: [...notas, 'sem credenciais: login e download não testados (crie a conta e defina os segredos)'] }
      const login = await fetch('https://inlabs.in.gov.br/logar.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ email, password: senha }),
        redirect: 'manual',
      })
      const cookie = (login.headers.get('set-cookie') || '').match(/inlabs_session_cookie=[^;]+/)?.[0]
      notas.push(`login: HTTP ${login.status}, cookie de sessão ${cookie ? 'recebido' : 'NÃO recebido'}`)
      if (!cookie) return { ok: false, notas }
      const dia = hoje()
      const r = await fetch(`https://inlabs.in.gov.br/index.php?p=${dia}&dl=${dia}-DO1.zip`, { headers: { Cookie: cookie } })
      const buf = Buffer.from(await r.arrayBuffer())
      notas.push(`DO1 de ${dia}: HTTP ${r.status}, ${Math.round(buf.length / 1024)} KB, ${buf.subarray(0, 2).toString() === 'PK' ? 'arquivo ZIP' : 'não é ZIP (talvez ainda não publicado)'}`)
      return { ok: r.status === 200, notas }
    },
  },
  {
    id: 'lexml',
    fonte: 'LexML',
    descricao: 'Busca SRU e resolução da URN do Código Florestal',
    async rodar() {
      const urn = 'urn:lex:br:federal:lei:2012-05-25;12651'
      const notas: string[] = []
      let amostra = ''
      for (const consulta of [`urn="${urn}"`, 'dc.title any "12651"', 'lei 12651']) {
        const sru = await textoCurto(`https://www.lexml.gov.br/busca/SRU?operation=searchRetrieve&version=1.1&query=${encodeURIComponent(consulta)}&maximumRecords=1`)
        const n = /numberOfRecords>\s*(\d+)/.exec(sru.corpo)?.[1]
        notas.push(`SRU [${consulta}]: HTTP ${sru.status}, ${sru.tipo}, ${n ?? '?'} registros; início: ${sru.corpo.replace(/\s+/g, ' ').slice(0, 160)}`)
        if (!amostra) amostra = sru.corpo.slice(0, 10_000)
      }
      const res = await obter(`https://www.lexml.gov.br/urn/${urn}`, rapido)
      notas.push(`URN: HTTP ${res.status}, terminou em ${res.url}`)
      return { ok: res.status === 200, notas, amostra }
    },
  },
  {
    id: 'tse',
    fonte: 'TSE',
    descricao: 'Catálogo "Candidatos 2022" e arquivo consulta_cand',
    async rodar() {
      const pk = await obterJson<{ result?: { resources?: { name: string; url: string; format: string }[] } }>(
        'https://dadosabertos.tse.jus.br/api/3/action/package_show?id=candidatos-2022',
        rapido,
      )
      const recursos = pk.result?.resources || []
      const cand = recursos.find((r) => /consulta_cand_2022\.zip$/i.test(r.url))
      const notas = [`${recursos.length} recursos no catálogo`, `consulta_cand: ${cand?.url || 'não encontrado'}`]
      if (cand) {
        const r = await obter(cand.url, { ...rapido, headers: { Range: 'bytes=0-1023' } })
        notas.push(`arquivo: HTTP ${r.status}, ${r.headers.get('content-range') || r.headers.get('content-length')}`)
      }
      return { ok: !!cand, notas, amostra: recursos.map((r) => ({ name: r.name, url: r.url, format: r.format })) }
    },
  },
  {
    id: 'ibge',
    fonte: 'IBGE',
    descricao: 'Lista de estados (a tabela de UFs também está no código; o IBGE serve para municípios)',
    async rodar() {
      const e = await obterJson<{ sigla: string }[]>('https://servicodados.ibge.gov.br/api/v1/localidades/estados', rapido)
      return { ok: e.length === 27, notas: [`${e.length} UFs`] }
    },
  },
  {
    id: 'querido-diario',
    fonte: 'Querido Diário',
    descricao: 'Busca em diários de Palmas (TO)',
    async rodar() {
      const notas: string[] = []
      for (const base of ['https://api.queridodiario.ok.org.br', 'https://api.queridodiario.org.br', 'https://queridodiario.ok.org.br/api']) {
        try {
          const r = await obterJson<{ total_gazettes?: number; gazettes?: unknown[] }>(`${base}/gazettes?territory_ids=1721000&size=1&querystring=ambiental`, { ...rapido, tentativas: 1 })
          notas.push(`${base}: ${r.total_gazettes ?? '?'} diários com "ambiental"`)
          return { ok: Array.isArray(r.gazettes), notas, amostra: r }
        } catch (e) {
          notas.push(`${base}: ${descreverErro(e)}`)
        }
      }
      return { ok: false, notas }
    },
  },
]
