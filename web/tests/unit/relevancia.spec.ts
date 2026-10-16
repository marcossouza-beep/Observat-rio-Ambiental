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

describe('variações dos termos', () => {
  const t = (termo: string, peso = 8, grupo?: string): Termo => ({ termo, peso, grupo })
  const achou = (texto: string, termo: string) => pontuar(texto, [t(termo)]).encontrados.length === 1

  it('singular e plural, nos dois sentidos', () => {
    expect(achou('Altera as normas das unidades de conservação', 'unidade de conservação')).toBe(true)
    expect(achou('Cria unidade de conservação estadual', 'unidades de conservação')).toBe(true)
    expect(achou('Dispõe sobre licenciamentos ambientais simplificados', 'licenciamento ambiental')).toBe(true)
    expect(achou('Reduz as emissões de gases', 'emissão')).toBe(true)
    expect(achou('Incentiva energias renováveis e sustentáveis', 'energia renovável')).toBe(true)
    expect(achou('Proíbe os lixões', 'lixão')).toBe(true)
    expect(achou('Protege as nascentes e os mananciais', 'manancial')).toBe(true)
    expect(achou('Regula os garimpos', 'garimpo')).toBe(true)
  })

  it('hífen ou espaço, acento e caixa', () => {
    expect(achou('Institui o Zoneamento Ecológico-Econômico do Estado', 'zoneamento ecológico econômico')).toBe(true)
    expect(achou('Combate ao JAVALI e ao javaporco', 'javali')).toBe(true)
    expect(achou('Pavimentação da BR-319', 'BR-319')).toBe(true)
  })

  it('palavras curtas não viram outra coisa', () => {
    expect(achou('Altera duas leis estaduais', 'lei estadual')).toBe(true)
    expect(achou('O mal do século', 'mais')).toBe(false)
    expect(achou('Proibido no país', 'pal')).toBe(false)
  })

  it('a mesma raiz e o termo contido em outro não somam duas vezes', () => {
    const dic = [t('agrotóxico', 9, 'Agrotóxicos'), t('agrotóxicos', 9, 'Agrotóxicos'), t('licença ambiental', 9), t('licença ambiental por adesão e compromisso', 9)]
    const r = pontuar('Proíbe agrotóxicos e a licença ambiental por adesão e compromisso', dic)
    expect(r.encontrados).toHaveLength(2)
    expect(r.encontrados).toContain('licença ambiental por adesão e compromisso')
    expect(pontuar('Proíbe agrotóxicos', dic).nota).toBe(pontuar('Proíbe agrotóxicos', [t('agrotóxico', 9)]).nota)
  })
})
