/**
 * Conector do SAPL (Fase 5, Norte) sobre respostas reais gravadas de AC, AM, RO e TO.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { autorDe, eventoDaSituacao, mapearMateria, siglaDoTipo, statusDaMateria, tabela, tipoDeInteresse, type ContextoSapl, type Registro } from '@/coleta/sapl/mapear'
import { ErroFormato } from '@/coleta/tipos'

const dir = path.resolve(__dirname, '../fixtures/coleta/sapl')
const corpo = (f: string) => JSON.parse(readFileSync(path.join(dir, `${f}.json`), 'utf8')).corpo
const lista = (f: string) => corpo(f).results as Registro[]

const contexto = (uf: string): ContextoSapl => ({
  uf,
  base: `https://sapl.al.${uf}.leg.br`,
  tipos: tabela(lista(`${uf}-tipos`)),
  situacoes: tabela(lista(`${uf}-status`)),
  unidades: tabela(lista(`${uf}-unidades`)),
  autores: new Map(),
})

describe('tipos de matéria que interessam', () => {
  const to = contexto('to')
  const por = (sigla: string) => [...to.tipos.values()].find((t) => t.sigla === sigla)
  it('projetos de lei, PEC, MP, decreto legislativo e veto entram', () => {
    for (const s of ['PLO', 'PLG', 'PLCC', 'PLTJ', 'PEC', 'MP', 'PDL', 'VT']) expect([s, tipoDeInteresse(por(s))]).toEqual([s, true])
  })
  it('requerimentos, indicações, moções, resolução, prestação de contas e afins ficam de fora', () => {
    for (const s of ['REQ', 'INFO', 'APLAU', 'PR', 'PCG', 'EMD', 'CCP', 'NUL', 'SUBST', 'EM']) expect([s, tipoDeInteresse(por(s))]).toEqual([s, false])
    const ac = contexto('ac')
    expect(tipoDeInteresse([...ac.tipos.values()].find((t) => /indica/i.test(String(t.descricao))))).toBe(false)
  })
  it('sigla da casa; sem sigla, iniciais do tipo', () => {
    expect(siglaDoTipo(por('PLO'))).toBe('PLO')
    expect(siglaDoTipo({ descricao: 'Projeto de Lei Ordinária' })).toBe('PLO')
  })
})

describe('matéria do SAPL no formato comum', () => {
  it('Tocantins: MP 1/2026 com as cinco tramitações, situação, órgão, autoria do governador e texto', () => {
    const ctx = contexto('to')
    ctx.autores.set(184, corpo('to-autor'))
    const p = mapearMateria(corpo('to-materia-0'), lista('to-tramitacao-0'), lista('to-autoria-0'), ctx)
    expect(p.proposicao).toMatchObject({
      chave: 'sapl:to:13716',
      casa: 'assembleia',
      esfera: 'estadual',
      uf: 'TO',
      sigla: 'MP',
      numero: 1,
      ano: 2026,
      statusOficial: 'Proposição aprovada',
      statusSimplificado: 'aprovada',
      etapa: 'Diretoria Legislativa - DIRLEG',
      regime: 'normal',
      urlFonte: 'https://sapl.al.to.leg.br/materia/13716',
      urlInteiroTeor: 'http://sapl.al.to.leg.br/media/sapl/public/materialegislativa/2026/13716/mp_n_1-2.pdf',
      autoria: [{ papel: 'autor', nomeLivre: 'WANDERLEI BARBOSA CASTRO (Governador do Estado)' }],
    })
    expect(p.proposicao.ementa).toMatch(/^Altera a lei nº 1\.287/)
    expect(p.tramitacoes.map((t) => [t.data.slice(0, 10), t.tipoEvento])).toEqual([
      ['2026-02-04', 'outro'],
      ['2026-03-04', 'outro'],
      ['2026-04-29', 'outro'],
      ['2026-05-06', 'pauta'],
      ['2026-05-27', 'aprovacao'],
    ])
    expect(p.tramitacoes[0]).toMatchObject({ chave: expect.stringMatching(/^sapl:to:tram:\d+$/), orgao: 'CCJ - Comissão de Constituição Justiça e Redação', descricao: 'Aguardando Análise da Comissão' })
    expect(p.proposicao.ultimaMovimentacao).toBe(p.tramitacoes.at(-1)!.data)
    expect(p.versoes).toEqual([expect.objectContaining({ chave: 'sapl:to:texto:13716', tipo: 'original', url: p.proposicao.urlInteiroTeor })])
  })

  it('matérias reais das quatro casas passam pelo mapeamento sem erro de formato', () => {
    for (const uf of ['ac', 'am', 'ro', 'to']) {
      const ctx = contexto(uf)
      for (const m of lista(`${uf}-materias`)) expect(() => mapearMateria(m, [], [], ctx)).not.toThrow()
    }
  })

  it('deputado autor vira parlamentar da Assembleia', () => {
    const ctx = contexto('ac')
    ctx.autores.set(116, corpo('ac-autor'))
    expect(autorDe({ autor: 116, primeiro_autor: true }, ctx, true)).toEqual({
      papel: 'autor',
      parlamentar: { chave: 'sapl:ac:parlamentar:238', nome: 'FAGNER CALEGÁRIO', uf: 'AC', casa: 'assembleia' },
    })
  })

  it('sem ementa, a fonte mudou de formato: para e avisa', () => {
    const m = { ...corpo('to-materia-0'), ementa: '' }
    expect(() => mapearMateria(m, [], [], contexto('to'))).toThrow(ErroFormato)
  })
})

describe('situações do SAPL', () => {
  it('evento de cada andamento', () => {
    const casos: [string, string][] = [
      ['Aguardando a inclusão na ordem do dia', 'pauta'],
      ['Retirado da pauta da Ordem do Dia', 'outro'],
      ['Proposição distribuída às comissões', 'outro'],
      ['Proposição aprovada em 1º turno', 'votacao'],
      ['Proposição aprovada', 'aprovacao'],
      ['Proposição rejeitada pelo Plenário', 'votacao'],
      ['Lei Sancionada', 'sancao'],
      ['Mensagem de Veto', 'veto'],
      ['Veto sobre a proposição rejeitado', 'votacao'],
      ['Proposição arquivada', 'arquivamento'],
      ['Proposição Desarquivada', 'outro'],
    ]
    for (const [s, e] of casos) expect([s, eventoDaSituacao(s)]).toEqual([s, e])
  })
  it('situação simples da matéria', () => {
    expect(statusDaMateria('Lei Sancionada', false)).toBe('norma')
    expect(statusDaMateria('Aguardando Autógrafo', true)).toBe('aprovada')
    expect(statusDaMateria('Proposição aprovada', false)).toBe('aprovada')
    expect(statusDaMateria('Proposição retirada pelo autor', false)).toBe('rejeitada')
    expect(statusDaMateria('Encaminhamento ao Arquivo', false)).toBe('arquivada')
    expect(statusDaMateria('Aguardando Análise da Comissão', true)).toBe('em_tramitacao')
  })
})
