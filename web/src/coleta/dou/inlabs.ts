/**
 * INLABS (Imprensa Nacional): download das edições do Diário Oficial da União em XML.
 * Login com e-mail e senha (segredos INLABS_EMAIL e INLABS_SENHA) e um ZIP por dia e seção.
 * Fluxo conforme o exemplo oficial da Imprensa Nacional (github.com/Imprensa-Nacional/inlabs).
 */
import { USER_AGENT } from '../http'

export const INLABS = 'https://inlabs.in.gov.br'
/** Cabeçalho que o exemplo oficial manda em todo download. */
const ORIGEM = '736372697074'

export type Baixar = typeof fetch

export class ErroInlabs extends Error {}

/**
 * Entra no INLABS e devolve o cookie de sessão. O INLABS às vezes recusa um login logo depois de outro
 * (ex.: dois fluxos ao mesmo tempo): tenta de novo, com espera.
 */
export async function entrarInlabs(email: string, senha: string, baixar: Baixar = fetch, dormir = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))): Promise<string> {
  let motivo = ''
  let foraDoAr = false
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    if (tentativa) await dormir(10_000 * tentativa)
    const r = await baixar(`${INLABS}/logar.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'text/html,application/xhtml+xml', 'User-Agent': USER_AGENT },
      body: new URLSearchParams({ email, password: senha }).toString(),
      redirect: 'manual',
    })
    const cookies = (r.headers.getSetCookie?.() || []).map((c) => c.split(';')[0]).filter(Boolean)
    if (cookies.some((c) => c.startsWith('inlabs_session_cookie='))) return cookies.join('; ')
    // Mensagem da página de login (sem dados da conta), para entender a recusa
    const corpo = r.status === 200 ? await r.text().catch(() => '') : ''
    const aviso = /class="[^"]*(?:alert|erro|error)[^"]*"[^>]*>([^<]{3,200})</i.exec(corpo)?.[1] || /<title>([^<]{1,120})<\/title>/i.exec(corpo)?.[1] || ''
    motivo = `HTTP ${r.status}${aviso ? `, página: "${aviso.trim()}"` : ''}`
    foraDoAr = r.status >= 500
  }
  // 5xx é falha do servidor da Imprensa Nacional, não da senha
  if (foraDoAr) throw new ErroInlabs(`INLABS fora do ar no login (${motivo}). A coleta do DOU tenta de novo na próxima rodada.`)
  throw new ErroInlabs(`INLABS recusou o login (${motivo}). Confira os segredos INLABS_EMAIL e INLABS_SENHA.`)
}

/**
 * Baixa a edição de um dia ("DO1" = Seção 1, "DO1E" = edições extras da Seção 1).
 * Devolve null quando não há edição (fim de semana, feriado, extra que não saiu).
 */
export async function baixarEdicao(cookie: string, data: string, secao: string, baixar: Baixar = fetch): Promise<Buffer | null> {
  const r = await baixar(`${INLABS}/index.php?p=${data}&dl=${data}-${secao}.zip`, {
    headers: { Cookie: cookie, origem: ORIGEM, 'User-Agent': USER_AGENT },
  })
  if (r.status === 404) return null
  if (!r.ok) throw new ErroInlabs(`INLABS: HTTP ${r.status} ao baixar ${data}-${secao}`)
  const buf = Buffer.from(await r.arrayBuffer())
  if (buf.length >= 4 && buf.readUInt32LE(0) === 0x04034b50) return buf
  const inicio = buf.toString('utf8', 0, 2000)
  if (/logar|login|senha|password/i.test(inicio)) throw new ErroInlabs('INLABS: a sessão expirou ou o login não valeu para o download')
  return null
}
