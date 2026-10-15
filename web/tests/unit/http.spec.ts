import { describe, expect, it, vi } from 'vitest'
import { ErroHttp, obter, paginasCamara } from '@/coleta/http'

const resposta = (status: number, corpo: unknown = {}, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(corpo), { status, headers: { 'content-type': 'application/json', ...headers } })

const semEspera = { dormir: async () => {}, intervaloMinimoMs: 0 }

describe('cliente HTTP', () => {
  it('repete em 429 e 5xx e respeita Retry-After', async () => {
    const esperas: number[] = []
    const f = vi.fn()
      .mockResolvedValueOnce(resposta(429, {}, { 'retry-after': '3' }))
      .mockResolvedValueOnce(resposta(503))
      .mockResolvedValueOnce(resposta(200, { ok: true }))
    const r = await obter('https://exemplo.gov.br/a', { fetchImpl: f, intervaloMinimoMs: 0, esperaBaseMs: 100, dormir: async (ms) => void esperas.push(ms) })
    expect(r.status).toBe(200)
    expect(f).toHaveBeenCalledTimes(3)
    expect(esperas).toEqual([3000, 200])
  })
  it('não repete em 404', async () => {
    const f = vi.fn().mockResolvedValue(resposta(404))
    await expect(obter('https://exemplo.gov.br/b', { fetchImpl: f, ...semEspera })).rejects.toBeInstanceOf(ErroHttp)
    expect(f).toHaveBeenCalledTimes(1)
  })
  it('desiste depois das tentativas', async () => {
    const f = vi.fn().mockResolvedValue(resposta(500))
    await expect(obter('https://exemplo.gov.br/c', { fetchImpl: f, tentativas: 3, ...semEspera })).rejects.toThrow(/HTTP 500/)
    expect(f).toHaveBeenCalledTimes(3)
  })
  it('identifica o robô', async () => {
    const f = vi.fn().mockResolvedValue(resposta(200))
    await obter('https://exemplo.gov.br/d', { fetchImpl: f, ...semEspera })
    expect(f.mock.calls[0][1].headers['User-Agent']).toMatch(/ObservatorioAmbiental/)
  })
  it('percorre a paginação da Câmara', async () => {
    const f = vi.fn()
      .mockResolvedValueOnce(resposta(200, { dados: [1, 2], links: [{ rel: 'next', href: 'https://exemplo.gov.br/p2' }] }))
      .mockResolvedValueOnce(resposta(200, { dados: [3], links: [] }))
    const todos: number[] = []
    for await (const p of paginasCamara<number>('https://exemplo.gov.br/p1', { fetchImpl: f, ...semEspera })) todos.push(...p)
    expect(todos).toEqual([1, 2, 3])
  })
})
