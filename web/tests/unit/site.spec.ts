import { describe, expect, it } from 'vitest'
import { oQueJaSeSabe } from '@/lib/frase'
import { avisoDaLei } from '@/lib/aviso'
import { artigo, deUF } from '@/lib/rotulos'
import { cortar, descricaoParecer, jsonLdParecer, jsonLdTrilha, jurisdicao, tituloLei } from '@/lib/seo'

describe('rótulos', () => {
  it('preposição do estado', () => {
    expect(deUF('PA')).toBe('do Pará')
    expect(deUF('BA')).toBe('da Bahia')
    expect(deUF('GO')).toBe('de Goiás')
  })
  it('artigo da sigla', () => {
    expect(artigo('PL')).toBe('o')
    expect(artigo('PEC')).toBe('a')
    expect(artigo('MPV')).toBe('a')
    expect(artigo('Lei')).toBe('a')
  })
})

describe('o que já se sabe', () => {
  it('lei federal em tramitação, sem votação nem emendas', () => {
    expect(
      oQueJaSeSabe({ sigla: 'PL', rotulo: 'PL nº 140/2026', esfera: 'federal', statusSimplificado: 'em_tramitacao', statusOficial: 'Aguardando designação de relator', autores: [{ nome: 'Sen. Exemplo A', partido: 'PARTIDO', uf: 'MS' }], emendas: 0 }),
    ).toBe('O PL nº 140/2026 tramita no Congresso Nacional; a autoria é de Sen. Exemplo A (PARTIDO-MS). Situação oficial: Aguardando designação de relator. Ainda não houve votação. Nenhuma emenda foi apresentada até agora.')
  })
  it('estadual aprovada, com votação e emendas', () => {
    const f = oQueJaSeSabe({ sigla: 'PL', rotulo: 'PL nº 123/2026', esfera: 'estadual', uf: 'PA', statusSimplificado: 'aprovada', ultimaVotacao: { data: '2026-10-02T15:00:00Z', orgao: 'Plenário da Alepa', sim: 30, nao: 5 }, emendas: 2 })
    expect(f).toBe('O PL nº 123/2026 foi aprovado na Assembleia Legislativa do Pará. Na última votação, em 02/10/2026, Plenário da Alepa, o placar foi 30 a 5. Foram apresentadas 2 emendas.')
  })
  it('decreto e medida provisória', () => {
    expect(oQueJaSeSabe({ sigla: 'Decreto', rotulo: 'Decreto nº 12.345/2026', esfera: 'federal' })).toMatch(/já está em vigor/)
    expect(oQueJaSeSabe({ sigla: 'MPV', rotulo: 'MPV nº 1.300/2026', esfera: 'federal' })).toMatch(/^A MPV.*120 dias/)
  })
})

describe('aviso da lei', () => {
  it('parecer publicado, desatualizado, prometido e acompanhando', () => {
    expect(avisoDaLei({}, { status: 'publicado' }).tipo).toBe('parecer')
    expect(avisoDaLei({}, { status: 'publicado', desatualizadoDesde: '2026-10-12' }).tipo).toBe('desatualizado')
    expect(avisoDaLei({ situacaoEditorial: 'ativa', prazoParecer: '2026-10-21' }, { status: 'rascunho' })).toEqual({ tipo: 'em_preparacao', prazo: '2026-10-21' })
    expect(avisoDaLei({ situacaoEditorial: 'monitorada' }).tipo).toBe('acompanhando')
  })
})

describe('SEO', () => {
  it('título da lei muda quando o parecer sai', () => {
    const p = { rotulo: 'PL nº 1.234/2026', titulo: 'Licenciamento simplificado' }
    expect(tituloLei(p, 'em_preparacao')).toBe('PL nº 1.234/2026 — Licenciamento simplificado: o que é, situação e votação — parecer em breve')
    expect(tituloLei(p, 'parecer')).toBe('PL nº 1.234/2026 — Licenciamento simplificado: texto, tramitação e votação')
    expect(tituloLei(p, 'acompanhando')).not.toMatch(/parecer em breve/)
  })
  it('descrição do parecer até 155 caracteres', () => {
    const d = descricaoParecer({ impacto: 'alto', carater: 'malefico' }, 'O projeto dispensa o estudo de impacto ambiental para fazendas de médio porte. Outra frase.')
    expect(d).toBe('Parecer técnico: O projeto dispensa o estudo de impacto ambiental para fazendas de médio porte. Alto impacto, maléfico.')
    expect(cortar('a '.repeat(100)).length).toBeLessThanOrEqual(155)
  })
  it('dados estruturados', () => {
    const j = jsonLdParecer({ titulo: 'T', caminho: '/pareceres/x', autor: { nome: 'Autor', redes: ['https://lattes', null] }, lei: { nome: 'PL', identificador: 'PL 1/2026', jurisdicao: jurisdicao('estadual', 'PA') } })
    expect(j['@type']).toBe('Article')
    expect(j.author?.sameAs).toEqual(['https://lattes'])
    expect(j.about.legislationJurisdiction).toBe('BR-PA')
    expect(jsonLdTrilha([{ nome: 'Início', caminho: '/' }]).itemListElement[0].position).toBe(1)
  })
})
