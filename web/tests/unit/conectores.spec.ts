import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  mapearFichaCamara,
  mapearPautaCamara,
  mapearTramitacoesCamara,
  mapearVotacaoCamara,
  versaoOriginalCamara,
} from '@/coleta/camara/mapear'
import {
  mapearAgendaComissoesSenado,
  mapearAgendaPlenarioSenado,
  mapearInformesSenado,
  mapearProcessoSenado,
  mapearVotacoesSenado,
  resumosSenado,
} from '@/coleta/senado/mapear'
import { ErroFormato } from '@/coleta/tipos'

/** Respostas reais gravadas por `pnpm amostras` (tests/fixtures/coleta). */
const amostra = (nome: string) => {
  const g = JSON.parse(readFileSync(path.resolve(__dirname, '../fixtures/coleta', `${nome}.json`), 'utf8'))
  return g.corpo?.dados !== undefined ? g.corpo.dados : g.corpo
}

describe('Câmara', () => {
  const ficha = mapearFichaCamara(amostra('camara/pl3729-ficha'), { autores: amostra('camara/pl3729-autores'), temas: amostra('camara/pl3729-temas') })

  it('ficha: Lei Geral do Licenciamento', () => {
    expect(ficha).toMatchObject({ chave: 'camara:257161', casa: 'camara', sigla: 'PL', numero: 2159, ano: 2021, statusSimplificado: 'norma', regime: 'urgencia' })
    expect(ficha.ementa).toMatch(/^Dispõe sobre o licenciamento ambiental; regulamenta/)
    expect(ficha.ementa).not.toMatch(/NOVA EMENTA/)
    expect(ficha.temasOficiais).toContain('Meio Ambiente e Desenvolvimento Sustentável')
    expect(ficha.urlFonte).toBe('https://www.camara.leg.br/propostas-legislativas/257161')
    expect(ficha.dataApresentacao).toBe('2004-06-08T15:00:00.000Z')
  })

  it('autoria: autor e coautores ligados aos deputados', () => {
    expect(ficha.autoria!.length).toBeGreaterThan(3)
    expect(ficha.autoria![0].papel).toBe('autor')
    expect(ficha.autoria![0].parlamentar?.chave).toMatch(/^camara:deputado:\d+$/)
    expect(ficha.autoria!.slice(1).every((a) => a.papel === 'coautor')).toBe(true)
  })

  it('andamentos: tipos do Radar e versões do texto', () => {
    const { tramitacoes, versoes } = mapearTramitacoesCamara(ficha.chave, amostra('camara/pl3729-tramitacoes'))
    expect(tramitacoes.length).toBeGreaterThan(300)
    expect(new Set(tramitacoes.map((t) => t.chave)).size).toBe(tramitacoes.length)
    const tipos = new Set(tramitacoes.map((t) => t.tipoEvento))
    for (const t of ['apresentacao', 'parecer_relator', 'votacao', 'urgencia']) expect(tipos).toContain(t)
    // Aprovar uma emenda do Senado é votação, não aprovação do projeto
    const emenda = tramitacoes.find((t) => /Aprovada a Emenda do Senado nº 28/.test(t.descricao))
    expect(emenda?.tipoEvento).toBe('votacao')
    expect(versoes.length).toBeGreaterThan(0)
    expect(versoes.every((v) => v.chave.startsWith('camara:teor:') && v.tipo !== 'original')).toBe(true)
    expect(versoes.map((v) => v.tipo)).toContain('substitutivo')
    expect(versaoOriginalCamara(ficha)?.tipo).toBe('original')
  })

  it('votação nominal: placar, votos e orientações', () => {
    const v = mapearVotacaoCamara(ficha.chave, amostra('camara/votacao-detalhe'), amostra('camara/votacao-votos'), amostra('camara/votacao-orientacoes'))
    expect(v).toMatchObject({ chave: 'camara:votacao:257161-483', orgao: 'PLEN', resultado: 'Aprovada', placarSim: 231, placarNao: 87 })
    expect(v.votos!.length).toBeGreaterThan(300)
    expect(v.votos![0].parlamentar).toMatchObject({ casa: 'camara', chave: expect.stringMatching(/^camara:deputado:\d+$/) })
    expect(v.orientacoes!.length).toBeGreaterThan(3)
  })

  it('votação simbólica: placar só pela descrição', () => {
    const lista = amostra('camara/pl3729-votacoes')
    const v = mapearVotacaoCamara(ficha.chave, lista[0])
    expect(v.placarSim).toBe(231)
    expect(v.votos).toEqual([])
  })

  it('pauta: a proposta principal, não o parecer', () => {
    const itens = mapearPautaCamara(amostra('camara/pauta-evento'), amostra('camara/pauta'))
    expect(itens.length).toBeGreaterThan(0)
    expect(itens.every((i) => i.proposicao.startsWith('camara:') && !/Retirad/.test(i.descricao))).toBe(true)
    // O PL 2665/2022 foi retirado de pauta: não entra
    expect(itens.find((i) => i.proposicao === 'camara:2336218')).toBeUndefined()
  })

  it('formato mudou: para com erro claro', () => {
    expect(() => mapearFichaCamara({ id: 1, siglaTipo: 'PL', numero: 1, ano: 2026 })).toThrow(ErroFormato)
  })
})

describe('Senado', () => {
  const p = mapearProcessoSenado(amostra('senado/processo-detalhe'), amostra('senado/processo-relatoria'))

  it('processo: o mesmo PL 2159/2021, com chaves para juntar com a Câmara', () => {
    expect(p).toMatchObject({ chave: 'senado:8079566', casa: 'senado', sigla: 'PL', numero: 2159, ano: 2021, statusSimplificado: 'norma' })
    expect(p.statusOficial).toBe('Transformada em norma jurídica com veto parcial')
    expect(p.chavesExtras).toEqual(['senado:materia:148785'])
    expect(p.outrasIdentificacoes).toContain('PL 3729/2004')
    expect(p.temasOficiais).toContain('Meio ambiente')
    expect(p.urlFonte).toBe('https://www25.senado.leg.br/web/atividade/materias/-/materia/148785')
  })

  it('autoria: deputado autor pelo nome; relatoria encerrada não aparece', () => {
    expect(p.autoria![0]).toMatchObject({ papel: 'autor', nomeLivre: 'Dep. Luciano Zica (PT)' })
    expect(p.autoria!.some((a) => a.papel === 'relator')).toBe(false)
  })

  it('informes: tramitação, sanção e versões (original e autógrafo)', () => {
    const { tramitacoes, versoes } = mapearInformesSenado(amostra('senado/processo-detalhe'))
    expect(tramitacoes.length).toBeGreaterThan(100)
    expect(new Set(tramitacoes.map((t) => t.chave)).size).toBe(tramitacoes.length)
    expect(tramitacoes.some((t) => t.tipoEvento === 'sancao')).toBe(true)
    expect(versoes.map((v) => v.tipo)).toEqual(expect.arrayContaining(['original', 'autografo']))
    expect(new Set(versoes.map((v) => v.chave)).size).toBe(versoes.length)
  })

  it('votação nominal: 81 votos e placar contado', () => {
    const [v] = mapearVotacoesSenado(amostra('senado/votacao-processo'))
    expect(v).toMatchObject({ chave: 'senado:votacao:6935', proposicao: 'senado:8079566', resultado: 'Aprovada', orgao: 'PLEN' })
    expect(v.votos).toHaveLength(81)
    expect(v.placarSim! + v.placarNao!).toBeGreaterThan(50)
    expect(v.votos![0].parlamentar.chave).toMatch(/^senado:parlamentar:\d+$/)
  })

  it('agenda do Plenário e das comissões', () => {
    const plen = mapearAgendaPlenarioSenado(amostra('senado/agenda-plenario-mes'))
    expect(plen.length).toBeGreaterThan(0)
    expect(plen.every((x) => x.proposicao.startsWith('senado:materia:'))).toBe(true)
    const com = mapearAgendaComissoesSenado(amostra('senado/agenda-comissoes'))
    expect(com.length).toBeGreaterThan(0)
    expect(com.every((x) => /^senado:\d+$/.test(x.proposicao))).toBe(true)
  })

  it('busca de atualizados: resumos com id e ementa', () => {
    const r = resumosSenado(amostra('senado/processo-atualizados'))
    expect(r.length).toBeGreaterThan(10)
    expect(r[0]).toMatchObject({ id: expect.any(Number), ementa: expect.any(String) })
  })
})
