import { describe, expect, it } from 'vitest'
import { checarPublicacao, SECOES_PARECER, textoDe } from '@/lib/publicacao'
import { slugProposicao, rotuloProposicao } from '@/lib/texto'

const lexical = (t: string) => ({ root: { children: [{ children: [{ text: t, type: 'text' }], type: 'paragraph' }] } })
const completo = Object.fromEntries(
  SECOES_PARECER.map((s) => s.nome).map((k) => [k, lexical('Texto suficiente para contar como seção escrita.')]),
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
  it('libera com tudo preenchido, avisando do parecer técnico', () => {
    const r = checarPublicacao({ secoes: completo, impacto: 'alto', carater: 'malefico' })
    expect(r.pode).toBe(true)
    expect(r.avisos).toContain('Parecer técnico não enviado (o resumo prévio pode sair sem ele)')
  })
  it('quadro do cotejo vazio só avisa; com um ponto completo, some o aviso', () => {
    const aviso = 'Quadro "regime vigente e proposta" vazio: o leitor verá só o comentário'
    expect(checarPublicacao({ secoes: completo, impacto: 'alto', carater: 'malefico' }).avisos).toContain(aviso)
    const meio = { ...completo, comparativo: [{ vigente: 'Exigido', proposto: '' }] }
    expect(checarPublicacao({ secoes: meio, impacto: 'alto', carater: 'malefico' }).avisos).toContain(aviso)
    const cheio = { ...completo, comparativo: [{ vigente: 'Exigido', proposto: 'Dispensado', efeito: 'reduz' }] }
    const r = checarPublicacao({ secoes: cheio, impacto: 'alto', carater: 'malefico' })
    expect(r.pode).toBe(true)
    expect(r.avisos).not.toContain(aviso)
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
