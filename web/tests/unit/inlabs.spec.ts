import { describe, expect, it } from 'vitest'
import { entrarInlabs } from '@/coleta/dou/inlabs'

const resposta = (status: number, cookie?: string) =>
  ({ status, headers: { getSetCookie: () => (cookie ? [`${cookie}; path=/`] : []) }, text: async () => '<title>INLABS</title>' }) as unknown as Response
const semEspera = async () => {}

describe('login no INLABS', () => {
  it('devolve o cookie de sessão', async () => {
    expect(await entrarInlabs('a@b', 'x', async () => resposta(302, 'inlabs_session_cookie=abc'), semEspera)).toBe('inlabs_session_cookie=abc')
  })

  it('erro 5xx do servidor não é confundido com senha errada', async () => {
    await expect(entrarInlabs('a@b', 'x', async () => resposta(502), semEspera)).rejects.toThrow(/fora do ar no login \(HTTP 502\)/)
  })

  it('sem cookie e sem erro do servidor: senha ou conta recusada', async () => {
    await expect(entrarInlabs('a@b', 'x', async () => resposta(200), semEspera)).rejects.toThrow(/recusou o login.*INLABS_EMAIL/)
  })
})
