import { describe, expect, it } from 'vitest'
import { agrupar, casaDeOrigem, chavesDeJurisdicao, padrao, ranking, type ItemPanorama } from '@/lib/panorama'

const item = (extra: Partial<ItemPanorama>): ItemPanorama => ({ carater: 'neutro', aprovada: false, esfera: 'federal', casaOrigem: 'camara', areas: [], biomas: [], ...extra })

describe('casa de origem', () => {
  it('pela chave da fonte, não pela casa onde a proposta está agora', () => {
    expect(casaDeOrigem({ esfera: 'federal', sigla: 'PL', chaveOrigem: 'camara:2345678', casa: 'senado' })).toBe('camara')
    expect(casaDeOrigem({ esfera: 'federal', sigla: 'PL', chaveOrigem: 'senado:160000', casa: 'camara' })).toBe('senado')
    expect(casaDeOrigem({ esfera: 'federal', sigla: 'VET', chaveOrigem: 'congresso:veto:123', casa: 'congresso' })).toBe('congresso')
  })
  it('medida provisória é da Presidência', () => expect(casaDeOrigem({ esfera: 'federal', sigla: 'MPV', chaveOrigem: 'camara:1', casa: 'camara' })).toBe('presidencia'))
  it('cadastro manual usa a casa informada; estadual não tem', () => {
    expect(casaDeOrigem({ esfera: 'federal', sigla: 'Lei', chaveOrigem: null, casa: 'presidencia' })).toBe('presidencia')
    expect(casaDeOrigem({ esfera: 'estadual', sigla: 'PL', chaveOrigem: null, casa: 'assembleia' })).toBeNull()
  })
})

describe('padrão de atuação', () => {
  const itens = [
    item({ carater: 'malefico', aprovada: true, impacto: 'alto', areas: [1, 2] }),
    item({ carater: 'malefico', areas: [1] }),
    item({ carater: 'enfraquece_indiretamente', impacto: 'alto', areas: [2] }),
    item({ carater: 'benefico', aprovada: true, areas: [1] }),
    item({ carater: 'neutro', impacto: 'medio' }),
  ]

  it('tudo que tramitou × só aprovadas, tendência e alto impacto', () => {
    const p = padrao(itens)
    expect(p.total).toBe(5)
    expect(p.tudo.percentuais).toEqual({ malefico: 40, enfraquece_indiretamente: 20, neutro: 20, benefico: 20 })
    expect(p.tendencia).toEqual({ tipo: 'enfraquece', saldo: -40, total: 5 })
    expect(p.aprovadas.total).toBe(2)
    expect(p.aprovadas.percentuais).toMatchObject({ malefico: 50, benefico: 50 })
    expect(p.tendenciaAprovadas.tipo).toBe('amostra_pequena')
    expect(p.altoImpacto).toBe(40)
    expect(p.areas).toEqual([
      { id: 1, n: 3 },
      { id: 2, n: 2 },
    ])
  })

  it('grupo vazio não quebra', () => {
    const p = padrao([])
    expect(p.total).toBe(0)
    expect(p.altoImpacto).toBe(0)
    expect(p.tendencia.tipo).toBe('amostra_pequena')
  })
})

describe('grupos', () => {
  it('federal conta na União e na casa; estadual, no estado', () => {
    expect(chavesDeJurisdicao({ esfera: 'federal', casaOrigem: 'senado' })).toEqual(['uniao', 'senado'])
    expect(chavesDeJurisdicao({ esfera: 'federal', casaOrigem: null })).toEqual(['uniao'])
    expect(chavesDeJurisdicao({ esfera: 'estadual', uf: 'pa' })).toEqual(['uf:PA'])
    expect(chavesDeJurisdicao({ esfera: 'municipal', uf: 'PA' })).toEqual([])
  })

  it('um parecer conta em cada bioma, sem contar duas vezes no mesmo', () => {
    const g = agrupar([item({ biomas: [7, 8, 7] }), item({ biomas: [8] })], (i) => i.biomas)
    expect(g.get('7')).toHaveLength(1)
    expect(g.get('8')).toHaveLength(2)
  })

  it('ranking: mais pareceres primeiro, empate pelo nome', () => {
    const l = (nome: string, n: number) => ({ nome, padrao: padrao(Array.from({ length: n }, () => item({}))) })
    expect(ranking([l('Pará', 1), l('Amazonas', 1), l('Tocantins', 3)]).map((x) => x.nome)).toEqual(['Tocantins', 'Amazonas', 'Pará'])
  })
})
