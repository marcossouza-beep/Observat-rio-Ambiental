/**
 * Cliente HTTP dos conectores: tempo limite, ritmo controlado por host,
 * repetição com espera crescente (respeita Retry-After) e identificação do robô.
 */

export const USER_AGENT = 'ObservatorioAmbiental/0.1 (+contato pelo site; coleta de dados abertos)'

export type OpcoesHttp = {
  tentativas?: number
  tempoLimiteMs?: number
  esperaBaseMs?: number
  intervaloMinimoMs?: number
  headers?: Record<string, string>
  fetchImpl?: typeof fetch
  dormir?: (ms: number) => Promise<void>
}

export class ErroHttp extends Error {
  constructor(
    message: string,
    public status: number | null,
    public url: string,
  ) {
    super(message)
  }
}

const ultimoPorHost = new Map<string, number>()
const dormirPadrao = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

async function respeitarRitmo(url: string, intervalo: number, dormir: (ms: number) => Promise<void>) {
  const host = new URL(url).host
  const agora = Date.now()
  const proximo = (ultimoPorHost.get(host) ?? 0) + intervalo
  ultimoPorHost.set(host, Math.max(agora, proximo))
  if (proximo > agora) await dormir(proximo - agora)
}

const repetivel = (status: number) => status === 429 || status >= 500

export async function obter(url: string, o: OpcoesHttp = {}): Promise<Response> {
  const {
    tentativas = 4,
    tempoLimiteMs = 30_000,
    esperaBaseMs = 2_000,
    intervaloMinimoMs = 600,
    headers = {},
    fetchImpl = fetch,
    dormir = dormirPadrao,
  } = o
  let ultimoErro: unknown
  for (let i = 0; i < tentativas; i++) {
    await respeitarRitmo(url, intervaloMinimoMs, dormir)
    const ctl = new AbortController()
    const t = setTimeout(() => ctl.abort(), tempoLimiteMs)
    try {
      const r = await fetchImpl(url, { headers: { 'User-Agent': USER_AGENT, ...headers }, signal: ctl.signal, redirect: 'follow' })
      if (r.ok) return r
      if (!repetivel(r.status)) throw new ErroHttp(`HTTP ${r.status} em ${url}`, r.status, url)
      ultimoErro = new ErroHttp(`HTTP ${r.status} em ${url}`, r.status, url)
      const retry = Number(r.headers.get('retry-after'))
      await dormir(Number.isFinite(retry) && retry > 0 ? retry * 1000 : esperaBaseMs * 2 ** i)
    } catch (e) {
      if (e instanceof ErroHttp && e.status && !repetivel(e.status)) throw e
      ultimoErro = e
      if (i < tentativas - 1) await dormir(esperaBaseMs * 2 ** i)
    } finally {
      clearTimeout(t)
    }
  }
  throw ultimoErro instanceof Error ? ultimoErro : new ErroHttp(`Falha em ${url}`, null, url)
}

export async function obterJson<T = unknown>(url: string, o: OpcoesHttp = {}): Promise<T> {
  const r = await obter(url, { ...o, headers: { Accept: 'application/json', ...(o.headers || {}) } })
  return (await r.json()) as T
}

/** Percorre a paginação da API da Câmara (links rel="next"). */
export async function* paginasCamara<T>(urlInicial: string, o: OpcoesHttp = {}, maxPaginas = 50) {
  let url: string | undefined = urlInicial
  for (let n = 0; url && n < maxPaginas; n++) {
    const corpo: { dados: T[]; links?: { rel: string; href: string }[] } = await obterJson(url, o)
    yield corpo.dados
    url = corpo.links?.find((l) => l.rel === 'next')?.href
  }
}
