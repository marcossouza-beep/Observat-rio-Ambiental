/**
 * Sessão do inscrito (sem senha) e tokens assinados.
 * - Link mágico: token aleatório de uso único; guardamos só o resumo (hash) e a validade.
 * - Sessão: cookie com o id do inscrito, assinado com HMAC (não dá para forjar sem o segredo).
 * - Descadastro: token assinado com finalidade própria, sem validade (precisa funcionar em e-mails antigos).
 */
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

export const COOKIE_SESSAO = 'obs_sessao'
export const DURACAO_SESSAO_DIAS = 60
export const VALIDADE_LINK_MIN = 60

const segredo = () => {
  const s = process.env.PAYLOAD_SECRET
  if (!s || s.length < 16) throw new Error('PAYLOAD_SECRET ausente ou curto')
  return s
}

const b64 = (b: Buffer | string) => Buffer.from(b).toString('base64url')
const assinar = (dados: string, finalidade: string) => createHmac('sha256', `${segredo()}:${finalidade}`).update(dados).digest('base64url')

function iguais(a: string, b: string) {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

export function assinarToken(conteudo: Record<string, unknown>, finalidade: string): string {
  const dados = b64(JSON.stringify(conteudo))
  return `${dados}.${assinar(dados, finalidade)}`
}

export function lerToken<T = Record<string, unknown>>(token: string | null | undefined, finalidade: string): T | null {
  if (!token || !token.includes('.')) return null
  const [dados, assinatura] = token.split('.')
  if (!dados || !assinatura || !iguais(assinatura, assinar(dados, finalidade))) return null
  try {
    const c = JSON.parse(Buffer.from(dados, 'base64url').toString()) as T & { exp?: number }
    if (c.exp && Date.now() > c.exp) return null
    return c
  } catch {
    return null
  }
}

export const criarSessao = (assinanteId: number | string, agora = Date.now()) =>
  assinarToken({ id: assinanteId, exp: agora + DURACAO_SESSAO_DIAS * 864e5 }, 'sessao')
export const lerSessao = (token?: string | null) => lerToken<{ id: number | string }>(token, 'sessao')

export const tokenDescadastro = (assinanteId: number | string) => assinarToken({ id: assinanteId }, 'descadastro')
export const lerDescadastro = (token?: string | null) => lerToken<{ id: number | string }>(token, 'descadastro')

/** Link mágico: devolve o token (vai no e-mail) e o que guardamos no banco. */
export function novoLinkMagico(agora = Date.now()) {
  const token = randomBytes(32).toString('base64url')
  return { token, hash: resumo(token), expira: new Date(agora + VALIDADE_LINK_MIN * 6e4).toISOString() }
}
export const resumo = (token: string) => createHash('sha256').update(token).digest('hex')

export function cookieSessao(valor: string, apagar = false) {
  const seguro = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  const idade = apagar ? 0 : DURACAO_SESSAO_DIAS * 86400
  return `${COOKIE_SESSAO}=${apagar ? '' : valor}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${idade}${seguro}`
}

export function lerCookie(cabecalho: string | null | undefined, nome = COOKIE_SESSAO) {
  return (cabecalho || '')
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${nome}=`))
    ?.slice(nome.length + 1)
}

/** E-mail válido o bastante para tentar enviar (o link de confirmação confirma de verdade). */
export const emailValido = (e: unknown): e is string => typeof e === 'string' && e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)
