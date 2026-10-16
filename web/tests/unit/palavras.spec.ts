/**
 * Dicionário de partida (seed): cobre todas as áreas e todos os biomas, sem termo repetido nem variação redundante
 * (singular/plural já são tratados pelo motor de relevância).
 */
import { describe, expect, it } from 'vitest'
import { pontuar, raiz, type Termo } from '@/lib/relevancia'
import { BIOMAS, PALAVRAS, PALAVRAS_NORTE, TEMAS } from '@/seed/dados'

const GRUPOS = new Set([...TEMAS, ...BIOMAS.map(([b]) => b), 'Geral', 'Exclusão'])
const dic: Termo[] = PALAVRAS.map(([termo, grupo, peso, exclusao]) => ({ termo, grupo, peso, exclusao: !!exclusao }))

describe('dicionário de palavras-chave', () => {
  it('cada termo está numa área, num bioma, em Geral ou em Exclusão (também os do Norte)', () => {
    for (const [termo, grupo] of [...PALAVRAS, ...PALAVRAS_NORTE]) expect(GRUPOS.has(grupo), `${termo} → ${grupo}`).toBe(true)
  })

  it('todas as áreas e todos os biomas têm termos', () => {
    const usados = new Set(PALAVRAS.map((p) => p[1]))
    for (const g of [...TEMAS, ...BIOMAS.map(([b]) => b)]) expect(usados.has(g), g).toBe(true)
  })

  it('sem variação redundante (mesma raiz) entre nacionais e regionais', () => {
    const raizes = [...PALAVRAS, ...PALAVRAS_NORTE].map((p) => raiz(p[0]))
    const repetidas = raizes.filter((r, i) => raizes.indexOf(r) !== i)
    expect(repetidas).toEqual([])
  })

  it('ementas reais: ambientais passam da nota mínima, as de rotina não', () => {
    const nota = (t: string) => pontuar(t, dic).nota
    // Pará (Alepa) e Roraima (Diário da ALE-RR), 2026
    expect(nota('Cria a Área de Proteção Ambiental Bacajaí - APA Bacajaí, nos Municípios de Altamira e Senador José Porfírio')).toBeGreaterThanOrEqual(40)
    expect(nota('Dispõe sobre a simplificação e integração de informações nos procedimentos de regularização e licenciamento ambiental')).toBeGreaterThanOrEqual(40)
    expect(nota('Dispõe sobre diretrizes de proteção das árvores centenárias, nativas e de relevante interesse ecológico e da vegetação nativa')).toBeGreaterThanOrEqual(40)
    expect(nota('Institui o Programa Guardiões dos Rios do Pará, destinado à preservação ambiental e ao monitoramento das nascentes')).toBeGreaterThanOrEqual(40)
    expect(nota('Declara e reconhece como de Utilidade Pública, para o Estado do Pará, o Instituto pelo Desenvolvimento Socioambiental da Amazônia')).toBe(0)
    expect(nota('Estima a Receita e fixa a Despesa do Estado para o exercício financeiro de 2027.')).toBe(0)
    expect(nota('Institui a Política Estadual de Saúde Vocal para os profissionais da educação')).toBe(0)
  })
})
