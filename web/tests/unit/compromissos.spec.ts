import { describe, expect, it } from 'vitest'
import { chave } from '@/lib/datas'
import { calcularPrazo, podeAtivarParecer, situacaoPrazo, textoPrazo } from '@/lib/compromissos'

const quartaMeioDia = new Date('2026-10-14T15:00:00Z')

describe('compromissos', () => {
  it('parecer prometido: 7 dias corridos', () => {
    expect(chave(calcularPrazo('parecer_prometido', quartaMeioDia))).toBe('2026-10-21')
  })
  it('correção: 3 dias úteis', () => {
    expect(chave(calcularPrazo('correcao', new Date('2026-10-13T12:00:00Z')))).toBe('2026-10-16')
  })
  it('credenciamento: 2 dias úteis', () => {
    expect(chave(calcularPrazo('credenciamento', new Date('2026-10-16T12:00:00Z')))).toBe('2026-10-20')
  })
  it('aceita regras ajustadas', () => {
    const regras = {
      parecer_prometido: { dias: 10, uteis: false },
      atualizacao: { dias: 5, uteis: false },
      correcao: { dias: 3, uteis: true },
      credenciamento: { dias: 2, uteis: true },
      lgpd: { dias: 15, uteis: false },
    }
    expect(chave(calcularPrazo('parecer_prometido', quartaMeioDia, regras))).toBe('2026-10-24')
  })
  it('classifica a situação do prazo', () => {
    const p = { ano: 2026, mes: 10, dia: 16 }
    expect(situacaoPrazo(p, quartaMeioDia)).toEqual({ situacao: 'perto', dias: 2 })
    expect(situacaoPrazo({ ano: 2026, mes: 10, dia: 14 }, quartaMeioDia).situacao).toBe('vence_hoje')
    expect(situacaoPrazo({ ano: 2026, mes: 10, dia: 12 }, quartaMeioDia)).toEqual({ situacao: 'atrasado', dias: -2 })
    expect(situacaoPrazo({ ano: 2026, mes: 10, dia: 21 }, quartaMeioDia).situacao).toBe('em_dia')
  })
  it('escreve o prazo como no painel', () => {
    expect(textoPrazo({ ano: 2026, mes: 10, dia: 12 }, quartaMeioDia)).toBe('Atrasado há 2 dias')
    expect(textoPrazo({ ano: 2026, mes: 10, dia: 15 }, quartaMeioDia)).toBe('Vence amanhã')
    expect(textoPrazo({ ano: 2026, mes: 10, dia: 21 }, quartaMeioDia)).toBe('Até 21/10')
  })
  it('freio de capacidade', () => {
    expect(podeAtivarParecer(9).pode).toBe(true)
    expect(podeAtivarParecer(10).pode).toBe(false)
  })
})
