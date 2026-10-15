import { describe, expect, it } from 'vitest'
import { etapaDoOrgao, regimeDe, statusDaSituacao, tipoDaVersao, tipoDoAndamento, votoDe } from '@/coleta/classificar'

describe('tipoDoAndamento', () => {
  it.each([
    ['Apresentação de Proposição', 'apresentacao'],
    ['Apresentação do Parecer do Relator n. 1 PLEN, pelo Dep. Fulano', 'parecer_relator'],
    ['Aprovado o Parecer', 'parecer_relator'],
    ['Apresentação do Substitutivo', 'substitutivo'],
    ['Aprovado o Requerimento n. 123/2026, que requer urgência', 'urgencia'],
    ['Votação em turno único', 'votacao'],
    ['Aprovada a Redação Final assinada pelo Relator', 'aprovacao'],
    ['Aprovado o Projeto, ressalvados os destaques', 'aprovacao'],
    ['Pronta para Pauta no PLENÁRIO (PLEN)', 'pauta'],
    ['Incluída na Ordem do Dia', 'pauta'],
    ['Transformado na Lei Ordinária 15.190/2025', 'sancao'],
    ['Remetida à sanção', 'aprovacao'],
    ['Sancionada. Lei 15190 de 2025', 'sancao'],
    ['SANCIONADA. LEI 15190 DE 2025. (vetada parcialmente: vide MSG 1097 de 2025)', 'sancao'],
    ['Vetado totalmente', 'veto'],
    ['Arquivada nos termos do Artigo 105 do RICD', 'arquivamento'],
    ['Desarquivada', 'outro'],
    ['Recebimento pela CMADS', 'outro'],
  ])('%s → %s', (texto, tipo) => expect(tipoDoAndamento(texto)).toBe(tipo))

  it('junta descrição e despacho', () => {
    expect(tipoDoAndamento('Parecer do Relator', 'Parecer pela aprovação, com substitutivo')).toBe('substitutivo')
  })
})

describe('statusDaSituacao', () => {
  it.each([
    ['Transformado em Norma Jurídica', 'norma'],
    ['Aguardando Sanção', 'aprovada'],
    ['Vetado totalmente', 'vetada'],
    ['Arquivada', 'arquivada'],
    ['Retirado pelo(a) Autor(a)', 'rejeitada'],
    ['Aguardando Designação de Relator(a)', 'em_tramitacao'],
  ])('%s → %s', (texto, status) => expect(statusDaSituacao(texto)).toBe(status))
  it('fora de tramitação sem situação conhecida vira arquivada', () => expect(statusDaSituacao('Aguardando', false)).toBe('arquivada'))
})

describe('regime, voto, versão e etapa', () => {
  it('regime', () => {
    expect(regimeDe('Urgência (Art. 155, RICD)')).toBe('urgencia')
    expect(regimeDe('Prioridade (Art. 151, II, RICD)')).toBe('prioridade')
    expect(regimeDe('Ordinário (Art. 151, III, RICD)')).toBe('normal')
  })
  it('voto', () => {
    expect(votoDe('Sim')).toBe('sim')
    expect(votoDe('Não')).toBe('nao')
    expect(votoDe('Abstenção')).toBe('abstencao')
    expect(votoDe('Obstrução')).toBe('obstrucao')
    expect(votoDe('AP')).toBe('ausente')
    expect(votoDe('Artigo 17')).toBe('outro')
  })
  it('versão', () => {
    expect(tipoDaVersao('Apresentação do Substitutivo')).toBe('substitutivo')
    expect(tipoDaVersao('Apresentação da Redação Final')).toBe('redacao_final')
    expect(tipoDaVersao('Remessa ao Senado Federal por meio do Of. nº 1')).toBe('autografo')
    expect(tipoDaVersao('Recebimento')).toBeNull()
    expect(tipoDaVersao('Parecer do Relator, pela aprovação')).toBeNull()
  })
  it('etapa', () => {
    expect(etapaDoOrgao('PLEN')).toBe('Plenário')
    expect(etapaDoOrgao('CMADS')).toBe('Comissões')
    expect(etapaDoOrgao(undefined)).toBeUndefined()
  })
})
