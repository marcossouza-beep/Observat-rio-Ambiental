import { describe, expect, it } from 'vitest'
import { padraoDasAutorias, resumoDosVotos, sentidoDoVoto } from '@/lib/parlamentar'

describe('como votou', () => {
  it('sentido do voto pelo caráter do parecer', () => {
    expect(sentidoDoVoto({ voto: 'sim', carater: 'benefico' })).toBe('a_favor')
    expect(sentidoDoVoto({ voto: 'nao', carater: 'malefico' })).toBe('a_favor')
    expect(sentidoDoVoto({ voto: 'sim', carater: 'enfraquece_indiretamente' })).toBe('contra')
    expect(sentidoDoVoto({ voto: 'ausente', carater: 'benefico' })).toBe('sem_voto')
    expect(sentidoDoVoto({ voto: 'sim', carater: 'neutro' })).toBe('neutra')
    expect(sentidoDoVoto({ voto: 'sim', carater: null })).toBe('sem_parecer')
  })
  it('resumo conta só propostas com parecer não neutro', () => {
    const r = resumoDosVotos([
      { voto: 'sim', carater: 'benefico' },
      { voto: 'nao', carater: 'malefico' },
      { voto: 'sim', carater: 'malefico' },
      { voto: 'ausente', carater: 'benefico' },
      { voto: 'sim', carater: 'neutro' },
      { voto: 'sim', carater: null },
    ])
    expect(r).toEqual({ total: 6, consideradas: 4, aFavor: 2, contra: 1, semVoto: 1, percentuais: { aFavor: 50, contra: 25, semVoto: 25 } })
  })
  it('autorias: distribuição e amostra pequena', () => {
    const p = padraoDasAutorias(['benefico', 'benefico', null])
    expect(p.distribuicao.total).toBe(2)
    expect(p.semParecer).toBe(1)
    expect(p.tendencia.tipo).toBe('amostra_pequena')
  })
})
