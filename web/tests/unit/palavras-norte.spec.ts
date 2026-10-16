import { describe, expect, it } from 'vitest'
import { REGIAO } from '@/lib/rotulos'
import { normalizar } from '@/lib/relevancia'
import { PALAVRAS, PALAVRAS_NORTE } from '@/seed/dados'

describe('palavras-chave da região Norte', () => {
  it('cobrem os sete estados, só do Norte, sem repetir termo do dicionário nacional', () => {
    const ufs = new Set(PALAVRAS_NORTE.map((p) => p[3]))
    expect([...ufs].sort()).toEqual(['AC', 'AM', 'AP', 'PA', 'RO', 'RR', 'TO'])
    for (const uf of ufs) expect(REGIAO[uf]).toBe('Norte')
    const todos = [...PALAVRAS, ...PALAVRAS_NORTE].map((p) => normalizar(p[0]))
    expect(new Set(todos).size).toBe(todos.length)
    for (const [, , peso] of PALAVRAS_NORTE) expect(peso).toBeGreaterThan(0)
  })
})
