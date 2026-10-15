import { describe, expect, it } from 'vitest'
import { diferencas, recortar, resumoDiferencas } from '@/lib/diferencas'

describe('diferenças entre versões', () => {
  it('marca o que entrou e o que saiu', () => {
    const t = diferencas('imóveis rurais de até 15 módulos fiscais', 'imóveis rurais de até 30 módulos fiscais')
    expect(t.filter((x) => x.tipo === 'retirado').map((x) => x.texto.trim())).toEqual(['15'])
    expect(t.filter((x) => x.tipo === 'incluido').map((x) => x.texto.trim())).toEqual(['30'])
    expect(resumoDiferencas(t)).toEqual({ incluidas: 1, retiradas: 1 })
  })
  it('textos iguais não têm marcação', () => {
    expect(diferencas('a b c', 'a b c').every((x) => x.tipo === 'igual')).toBe(true)
  })
  it('recorta trechos longos sem mudança', () => {
    const longo = Array.from({ length: 200 }, (_, i) => `p${i}`).join(' ')
    const r = recortar(diferencas(`${longo} fim`, `${longo} final`))
    expect(r[0].texto).toContain('[…]')
    expect(r[0].texto.length).toBeLessThan(longo.length)
  })
})
