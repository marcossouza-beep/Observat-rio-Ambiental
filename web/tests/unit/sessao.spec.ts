import { beforeAll, describe, expect, it } from 'vitest'
import { cookieSessao, criarSessao, emailValido, lerCookie, lerDescadastro, lerSessao, novoLinkMagico, resumo, tokenDescadastro } from '@/lib/sessao'
import { modelo } from '@/lib/email'

beforeAll(() => {
  process.env.PAYLOAD_SECRET ||= 'segredo-de-teste-0123456789abcdef'
})

describe('sessão do inscrito', () => {
  it('sessão assinada volta com o mesmo id', () => {
    expect(lerSessao(criarSessao(42))?.id).toBe(42)
  })
  it('sessão adulterada ou vencida é recusada', () => {
    const t = criarSessao(42)
    const [d, s] = t.split('.')
    const outro = Buffer.from(JSON.stringify({ id: 1, exp: Date.now() + 1e9 })).toString('base64url')
    expect(lerSessao(`${outro}.${s}`)).toBeNull()
    expect(lerSessao(`${d}.x${s.slice(1)}`)).toBeNull()
    expect(lerSessao(criarSessao(42, Date.now() - 61 * 864e5))).toBeNull()
    expect(lerSessao('lixo')).toBeNull()
  })
  it('token de descadastro não serve como sessão', () => {
    const t = tokenDescadastro(7)
    expect(lerDescadastro(t)?.id).toBe(7)
    expect(lerSessao(t)).toBeNull()
  })
  it('link mágico guarda só o resumo', () => {
    const l = novoLinkMagico()
    expect(l.hash).toBe(resumo(l.token))
    expect(l.hash).not.toContain(l.token)
    expect(new Date(l.expira).getTime()).toBeGreaterThan(Date.now())
  })
  it('cookie e e-mail', () => {
    expect(cookieSessao('abc')).toMatch(/obs_sessao=abc; Path=\/; HttpOnly; SameSite=Lax/)
    expect(lerCookie('a=1; obs_sessao=xyz; b=2')).toBe('xyz')
    expect(emailValido('ana@exemplo.com.br')).toBe(true)
    expect(emailValido('ana@exemplo')).toBe(false)
  })
  it('modelo de e-mail escapa HTML e leva o descadastro', () => {
    const m = modelo({ titulo: 'Oi <b>', paragrafos: ['Texto'], botao: { texto: 'Entrar', url: 'https://x/?a=1&b=2' }, descadastro: 'https://x/sair' })
    expect(m.html).toContain('Oi &lt;b&gt;')
    expect(m.html).toContain('a=1&amp;b=2')
    expect(m.texto).toContain('Não quero mais receber: https://x/sair')
  })
})
