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
    expect(tituloLei(p, 'em_preparacao')).toBe('PL nº 1.234/2026 — Licenciamento simplificado: o que é, situação e votação — resumo prévio em breve')
    expect(tituloLei(p, 'parecer')).toBe('PL nº 1.234/2026 — Licenciamento simplificado: texto, tramitação e votação')
    expect(tituloLei(p, 'acompanhando')).not.toMatch(/resumo prévio em breve/)
  })
  it('descrição do parecer até 155 caracteres', () => {
    const d = descricaoParecer({ impacto: 'alto', carater: 'malefico' }, 'O projeto dispensa o estudo de impacto ambiental para fazendas de médio porte. Outra frase.')
    expect(d).toBe('Resumo prévio: O projeto dispensa o estudo de impacto ambiental para fazendas de médio porte. Alto impacto, maléfico.')
    expect(cortar('a '.repeat(100)).length).toBeLessThanOrEqual(155)
  })
  it('dados estruturados', () => {
    const j = jsonLdParecer({ titulo: 'T', caminho: '/resumos/x', autor: { nome: 'Autor', redes: ['https://lattes', null] }, lei: { nome: 'PL', identificador: 'PL 1/2026', jurisdicao: jurisdicao('estadual', 'PA') } })
    expect(j['@type']).toBe('Article')
    expect(j.author?.sameAs).toEqual(['https://lattes'])
    expect(j.about.legislationJurisdiction).toBe('BR-PA')
    expect(jsonLdTrilha([{ nome: 'Início', caminho: '/' }]).itemListElement[0].position).toBe(1)
  })
})

describe('SEO da lei alterada e palavras-chave', async () => {
  const { descricaoLei, fraseAlteracao, jsonLdLei, palavrasDaPagina } = await import('@/lib/seo')
  const { leisCitadas } = await import('@/lib/leis')
  const cf = leisCitadas('Altera a Lei nº 12.651, de 25 de maio de 2012.')

  it('nome popular da lei vem da lista', () => {
    expect(cf[0]).toMatchObject({ rotulo: 'Lei nº 12.651/2012', nomePopular: 'Código Florestal' })
    // Sem o ano não há certeza de que é a lei federal
    expect(leisCitadas('Altera a Lei nº 12.651.')[0].nomePopular).toBeUndefined()
  })
  it('frase da alteração, com artigo certo', () => {
    expect(fraseAlteracao(cf)).toBe('Altera a Lei nº 12.651/2012 (Código Florestal).')
    expect(fraseAlteracao([...cf, { rotulo: 'Decreto nº 6.514/2008', tipo: 'Decreto' }])).toBe('Altera a Lei nº 12.651/2012 (Código Florestal) e o Decreto nº 6.514/2008.')
    expect(fraseAlteracao([])).toBe('')
  })
  it('descrição da página da lei leva a lei alterada', () => {
    expect(descricaoLei({}, 'Projeto de lei da Câmara sobre áreas de preservação.', 'acompanhando', cf)).toBe(
      'Projeto de lei da Câmara sobre áreas de preservação. Altera a Lei nº 12.651/2012 (Código Florestal).',
    )
  })
  it('palavras do editor e das leis alteradas, sem repetição', () => {
    expect(palavrasDaPagina({ palavraChave: 'PL 1234/2026 APP', nomePopular: 'PL das APPs urbanas', secundarias: ['código florestal', 'área de preservação permanente'] }, cf)).toEqual([
      'PL 1234/2026 APP',
      'PL das APPs urbanas',
      'código florestal',
      'área de preservação permanente',
      'Lei nº 12.651/2012',
    ])
  })
  it('dados estruturados: nome popular e legislação alterada', () => {
    const j = jsonLdLei({ nome: 'PL 1/2026', identificador: 'PL 1/2026', jurisdicao: 'BR', caminho: '/leis/pl-1-2026', nomePopular: 'PL das APPs urbanas', alteradas: cf })
    expect(j.alternateName).toBe('PL das APPs urbanas')
    expect(j.legislationChanges).toEqual([
      { '@type': 'Legislation', name: 'Lei nº 12.651/2012 (Código Florestal)', alternateName: 'Código Florestal', legislationIdentifier: 'urn:lex:br:federal:lei:2012-05-25;12651', url: 'https://www.lexml.gov.br/urn/urn:lex:br:federal:lei:2012-05-25;12651' },
    ])
  })
})

describe('descrição não corta em abreviatura', async () => {
  const { descricaoLei } = await import('@/lib/seo')
  it('"Dep." e "nº" não terminam a frase', () => {
    expect(descricaoLei({}, 'O PL nº 1.234/2026 tramita na Câmara; a autoria é de Dep. Exemplo F (PARTIDO-GO). Hoje está no Plenário.', 'parecer')).toBe(
      'O PL nº 1.234/2026 tramita na Câmara; a autoria é de Dep. Exemplo F (PARTIDO-GO). Leia o resumo prévio.',
    )
  })
})

describe('descrição longa com lei alterada', async () => {
  const { descricaoLei } = await import('@/lib/seo')
  const { leisCitadas } = await import('@/lib/leis')
  it('a lei alterada vem primeiro quando não cabe tudo', () => {
    const d = descricaoLei({}, 'O PL nº 1.234/2026 tramita no Congresso Nacional; a autoria é de Dep. Exemplo F (PARTIDO-GO), com relatoria na Comissão de Meio Ambiente.', 'parecer', leisCitadas('Lei nº 6.938, de 31 de agosto de 1981'))
    expect(d.startsWith('Altera a Lei nº 6.938/1981 (Política Nacional do Meio Ambiente). O PL nº 1.234/2026')).toBe(true)
    expect(d.length).toBeLessThanOrEqual(155)
  })
})
