import { describe, expect, it } from 'vitest'
import { distribuicao, tendencia, votoAFavorDaProtecao, type Carater } from '@/lib/indicadores'

const rep = (c: Carater, n: number) => Array(n).fill(c) as Carater[]

describe('indicadores', () => {
  it('amostra pequena abaixo de 5', () => {
    expect(tendencia(rep('benefico', 4)).tipo).toBe('amostra_pequena')
  })
  it('tende a proteger a partir de +15', () => {
    const t = tendencia([...rep('benefico', 6), ...rep('malefico', 2), ...rep('neutro', 2)])
    expect(t).toEqual({ tipo: 'protege', saldo: 40, total: 10 })
  })
  it('indireto conta como enfraquecimento', () => {
    const t = tendencia([...rep('benefico', 3), ...rep('enfraquece_indiretamente', 4), ...rep('neutro', 3)])
    expect(t.tipo).toBe('equilibrada')
    const t2 = tendencia([...rep('benefico', 2), ...rep('enfraquece_indiretamente', 4), ...rep('neutro', 4)])
    expect(t2.tipo).toBe('enfraquece')
  })
  it('distribuição em percentuais', () => {
    expect(distribuicao([...rep('benefico', 1), ...rep('malefico', 3)]).percentuais).toEqual({
      malefico: 75, enfraquece_indiretamente: 0, neutro: 0, benefico: 25,
    })
  })
  it('sentido do voto', () => {
    expect(votoAFavorDaProtecao('sim', 'benefico')).toBe(true)
    expect(votoAFavorDaProtecao('nao', 'enfraquece_indiretamente')).toBe(true)
    expect(votoAFavorDaProtecao('sim', 'malefico')).toBe(false)
    expect(votoAFavorDaProtecao('sim', 'neutro')).toBe(null)
    expect(votoAFavorDaProtecao('abstencao', 'benefico')).toBe(null)
  })
})
