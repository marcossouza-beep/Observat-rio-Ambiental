import { describe, expect, it } from 'vitest'
import { checarPublicacao, textoDe } from '@/lib/publicacao'
import { slugProposicao, rotuloProposicao } from '@/lib/texto'

const lexical = (t: string) => ({ root: { children: [{ children: [{ text: t, type: 'text' }], type: 'paragraph' }] } })
const completo = Object.fromEntries(
  ['resumo', 'oQueMuda', 'impactos', 'pontosAtencao', 'baseLegal', 'recomendacoes', 'conclusao'].map((k) => [k, lexical('Texto suficiente para contar como seção escrita.')]),
)

describe('publicação', () => {
  it('extrai texto do Lexical', () => {
    expect(textoDe(lexical('Olá mundo'))).toBe('Olá mundo')
  })
  it('trava sem seções, impacto e caráter', () => {
    const r = checarPublicacao({ secoes: {}, impacto: null, carater: null })
    expect(r.pode).toBe(false)
    expect(r.travas).toHaveLength(3)
  })
  it('libera com tudo preenchido, avisando da nota técnica', () => {
    const r = checarPublicacao({ secoes: completo, impacto: 'alto', carater: 'malefico' })
    expect(r.pode).toBe(true)
    expect(r.avisos).toContain('Nota técnica não enviada (o parecer pode sair sem ela)')
  })
  it('nova versão exige nota do que mudou', () => {
    expect(checarPublicacao({ secoes: completo, impacto: 'alto', carater: 'malefico', versao: 2 }).pode).toBe(false)
    expect(checarPublicacao({ secoes: completo, impacto: 'alto', carater: 'malefico', versao: 2, notaDaVersao: 'Substitutivo dobrou o limite.' }).pode).toBe(true)
  })
  it('endereço e rótulo', () => {
    expect(slugProposicao('PL', '1.234', 2026, 'Licenciamento simplificado')).toBe('pl-1234-2026-licenciamento-simplificado')
    expect(rotuloProposicao('PL', 1234, 2026)).toBe('PL nº 1.234/2026')
  })
})
