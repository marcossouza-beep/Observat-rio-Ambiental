import { describe, expect, it } from 'vitest'
import { pontuar, type Termo } from '@/lib/relevancia'

const dic: Termo[] = [
  { termo: 'unidades de conservação', peso: 9, grupo: 'Unidades de conservação' },
  { termo: 'recategorização', peso: 6, grupo: 'Unidades de conservação' },
  { termo: 'tilápia', peso: 6, grupo: 'Espécies exóticas' },
  { termo: 'árvore', peso: 2 },
  { termo: 'dia nacional', peso: 0, exclusao: true },
]

describe('relevância', () => {
  it('ignora acento e caixa e soma pesos', () => {
    const r = pontuar('Permite a RECATEGORIZACAO de Unidades de Conservacao por ato do Executivo.', dic)
    expect(r.encontrados).toEqual(['unidades de conservação', 'recategorização'])
    expect(r.nota).toBeGreaterThan(75)
    expect(r.grupos).toEqual(['Unidades de conservação'])
  })
  it('respeita limite de palavra', () => {
    expect(pontuar('Cria a Tilápiaria Ltda.', dic).nota).toBe(0)
  })
  it('termo de exclusão zera a nota', () => {
    const r = pontuar('Institui o Dia Nacional do Ipê, árvore símbolo', dic)
    expect(r.excluida).toBe(true)
    expect(r.nota).toBe(0)
  })
  it('termo fraco dá nota baixa', () => {
    expect(pontuar('Plantio de árvore em praças', dic).nota).toBeLessThan(25)
  })
})
