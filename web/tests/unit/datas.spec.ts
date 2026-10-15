import { describe, expect, it } from 'vitest'
import { chave, dataCivil, ehDiaUtil, feriados, pascoa, somarDiasUteis } from '@/lib/datas'

describe('datas', () => {
  it('calcula a Páscoa', () => {
    expect(chave(pascoa(2026))).toBe('2026-04-05')
    expect(chave(pascoa(2027))).toBe('2027-03-28')
  })
  it('inclui feriados nacionais, Sexta-feira Santa e Consciência Negra', () => {
    const f = feriados(2026)
    expect(f.has('2026-04-03')).toBe(true) // Sexta-feira Santa
    expect(f.has('2026-11-20')).toBe(true)
    expect(f.has('2026-10-12')).toBe(true)
    expect(f.has('2026-02-16')).toBe(false) // Carnaval só com pontos facultativos
    expect(feriados(2026, true).has('2026-02-16')).toBe(true)
  })
  it('fim de semana e feriado não são dias úteis', () => {
    expect(ehDiaUtil({ ano: 2026, mes: 10, dia: 17 })).toBe(false) // sábado
    expect(ehDiaUtil({ ano: 2026, mes: 10, dia: 12 })).toBe(false) // feriado
    expect(ehDiaUtil({ ano: 2026, mes: 10, dia: 13 })).toBe(true)
  })
  it('soma dias úteis sem contar o dia de início', () => {
    // terça 13/10 + 3 úteis = sexta 16/10
    expect(chave(somarDiasUteis({ ano: 2026, mes: 10, dia: 13 }, 3))).toBe('2026-10-16')
    // sábado 10/10 + 3 úteis: 12/10 é feriado → 13, 14, 15
    expect(chave(somarDiasUteis({ ano: 2026, mes: 10, dia: 10 }, 3))).toBe('2026-10-15')
    // quinta 19/11 + 1 útil: 20/11 feriado, 21-22 fim de semana → 23/11
    expect(chave(somarDiasUteis({ ano: 2026, mes: 11, dia: 19 }, 1))).toBe('2026-11-23')
  })
  it('usa o dia civil de Brasília', () => {
    // 02:30 UTC de 15/10 ainda é 14/10 em Brasília
    expect(chave(dataCivil(new Date('2026-10-15T02:30:00Z')))).toBe('2026-10-14')
  })
})
