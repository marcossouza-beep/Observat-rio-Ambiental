/**
 * Fase 6 (Sudeste): Minas Gerais pela API de dados abertos da ALMG e São Paulo pela API do processo legislativo da
 * Alesp, sobre respostas reais.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  autoresAlmg,
  eventoAlmg,
  itensAlmg,
  pacoteAlmg,
  statusAlmg,
  urlPesquisaAlmg,
} from '@/coleta/almg/mapear'
import { acompanhadasDeMinas, criarConectorAlmg } from '@/coleta/almg/conector'
import {
  autoresAlesp,
  eventoAlesp,
  identidadeAlesp,
  lerPesquisaAlesp,
  lerTramitacoesAlesp,
  pacoteAlesp,
  urlPesquisaAlesp,
  type DetalhesAlesp,
} from '@/coleta/alesp/mapear'
import { criarConectorAlesp } from '@/coleta/alesp/conector'

const dir = path.resolve(__dirname, '../fixtures/coleta/almg')
const resposta = (f: string) =>
  JSON.parse(JSON.parse(readFileSync(path.join(dir, `${f}.json`), 'utf8')).corpo.html)

describe('ALMG (Minas Gerais)', () => {
  it('monta a pesquisa direcionada: tipo, número, ano, página e tamanho', () => {
    expect(urlPesquisaAlmg({ tipo: 'PL', ano: 2026, pagina: 2 })).toBe(
      'https://dadosabertos.almg.gov.br/ws/proposicoes/pesquisa/direcionada?formato=json&tipo=PL&ano=2026&tp=20&p=2',
    )
    expect(urlPesquisaAlmg({ tipo: 'PL', numero: 6187, ano: 2026 })).toBe(
      'https://dadosabertos.almg.gov.br/ws/proposicoes/pesquisa/direcionada?formato=json&tipo=PL&num=6187&ano=2026&tp=20',
    )
  })

  it('lê os itens e o total; formato inesperado é erro de formato', () => {
    const { itens, total } = itensAlmg(resposta('pl-ano'))
    expect(total).toBe(1004)
    expect(itens).toHaveLength(20)
    expect(itens.map((i) => Number(i.numero)).slice(0, 3)).toEqual([6187, 6186, 6177])
    expect(itensAlmg(resposta('pl-ano-p2')).itens[0].numero).toBe('6089')
    expect(() => itensAlmg({ erro: 'x' })).toThrow()
  })

  it('pacote: ementa, autor, situação, local, temas oficiais e o histórico inteiro', () => {
    const p = pacoteAlmg(itensAlmg(resposta('pl-numero')).itens[0])!
    expect(p.proposicao).toMatchObject({
      chave: 'almg:PL-6187-2026',
      uf: 'MG',
      esfera: 'estadual',
      sigla: 'PL',
      numero: 6187,
      ano: 2026,
      dataApresentacao: '2026-10-16',
      statusSimplificado: 'em_tramitacao',
      etapa: 'Comissão de Fiscalização Financeira e Orçamentária',
      temasOficiais: ['Finanças Públicas'],
    })
    expect(p.proposicao.ementa).toMatch(/^Estima as receitas e fixa as despesas/)
    expect(p.proposicao.autoria).toEqual([{ papel: 'autor', nomeLivre: 'Governador do Estado' }])
    expect(p.tramitacoes[0]).toMatchObject({
      chave: 'almg:tram:PL-6187-2026:1',
      data: '2026-10-14',
      orgao: 'Plenário',
      tipoEvento: 'apresentacao',
    })
    expect(p.tramitacoes[0].descricao).toMatch(
      /^Proposição recebida em Plenário\. Publicado no DL em 16 10 2026/,
    )
  })

  it('autores: deputados viram parlamentares', () => {
    expect(autoresAlmg('Deputada Beatriz Cerqueira\nDeputado Ulysses Gomes\n')).toEqual([
      {
        papel: 'autor',
        parlamentar: {
          chave: 'almg:parlamentar:beatriz-cerqueira',
          nome: 'Beatriz Cerqueira',
          uf: 'MG',
          casa: 'assembleia',
        },
      },
      {
        papel: 'autor',
        parlamentar: {
          chave: 'almg:parlamentar:ulysses-gomes',
          nome: 'Ulysses Gomes',
          uf: 'MG',
          casa: 'assembleia',
        },
      },
    ])
  })

  it('classifica andamentos e situação', () => {
    expect(eventoAlmg('Designado relator o deputado Fulano.')).toBe('parecer_relator')
    expect(eventoAlmg('Aprovado em 1º turno.')).toBe('aprovacao')
    expect(eventoAlmg('Incluído na ordem do dia da reunião de 20 10 2026.')).toBe('pauta')
    expect(statusAlmg({ situacao: 'Transformado em norma jurídica' })).toBe('norma')
    expect(statusAlmg({ situacao: 'Aguardando sanção' })).toBe('aprovada')
    expect(statusAlmg({ situacao: 'Arquivado' })).toBe('arquivada')
  })

  it('acompanhadas de Minas pela chave ou pelo número no estado', () => {
    expect(
      acompanhadasDeMinas(
        new Set([
          'almg:PL-6187-2026',
          'MG:PL 6187/2026',
          'MG:PEC 68/2026',
          'MG:REQ 1/2026',
          'SP:PL 1/2026',
        ]),
      ),
    ).toEqual([
      { sigla: 'PL', numero: 6187, ano: 2026 },
      { sigla: 'PEC', numero: 68, ano: 2026 },
    ])
  })

  it('conector: páginas até sair do período, nova pela relevância, acompanhada pelo número, com intervalo entre chamadas', async () => {
    const chamadas: string[] = []
    let esperas = 0
    const buscar = async (url: string) => {
      chamadas.push(url)
      if (url.includes('num=')) return resposta('pl-numero')
      if (url.includes('tipo=PL&') && url.includes('&p=2')) return resposta('pl-ano-p2')
      if (url.includes('tipo=PL&')) return resposta('pl-ano')
      if (url.includes('tipo=PLC')) return resposta('plc-ano')
      return resposta('pec-ano')
    }
    const r = await criarConectorAlmg({ esperar: async () => void esperas++ }).coletar({
      desde: new Date('2026-10-16T00:00:00Z'),
      agora: new Date('2026-10-16T20:00:00Z'),
      acompanhadas: new Set(['MG:PL 6187/2026', 'MG:PEC 1/2025']),
      descartadas: new Set<string>(),
      relevancia: () => 0,
      notaMinima: 40,
      maxNovas: 5,
      buscar,
    })
    expect(esperas).toBe(chamadas.length - 1)
    expect(r.pacotes.map((p) => p.proposicao.chave)).toContain('almg:PL-6187-2026')
    expect(r.amostra).toMatchObject({ acompanhadasAchadas: '0/1' })
  })
})

describe('Alesp (São Paulo)', () => {
  const sp = (f: string) =>
    JSON.parse(
      readFileSync(path.resolve(__dirname, '../fixtures/coleta/alesp', `${f}.json`), 'utf8'),
    ).corpo

  it('monta a pesquisa: proposituras do ano dos quatro tipos, ou de um número', () => {
    expect(urlPesquisaAlesp({ ano: 2026 })).toBe(
      'https://legis-api-portal-prd.al.sp.gov.br/processo?page=0&size=50&sort=desc&flPropositura=true&ano=2026&listaIdTipoProcesso=1&listaIdTipoProcesso=2&listaIdTipoProcesso=4&listaIdTipoProcesso=5',
    )
    expect(urlPesquisaAlesp({ sigla: 'PL', numero: 863, ano: 2026, tamanho: 10 })).toBe(
      'https://legis-api-portal-prd.al.sp.gov.br/processo?page=0&size=10&sort=desc&flPropositura=true&ano=2026&numero=863&listaIdTipoProcesso=1',
    )
  })

  it('lê a pesquisa (mais novas primeiro) e a identificação de cada proposta', () => {
    const { itens, paginas } = lerPesquisaAlesp(sp('processos'))
    expect(paginas).toBe(47)
    expect(identidadeAlesp(itens[0])).toEqual({ sigla: 'PL', numero: 884, ano: 2026 })
    expect(itens[0].dtPublicacao).toBe('2026-10-19')
    expect(() => lerPesquisaAlesp({})).toThrow()
  })

  it('andamentos sem HTML; "Pauta de 1ª sessão (Emenda)" é prazo de emendas', () => {
    const t = lerTramitacoesAlesp(sp('processo-tramitacoes'))
    expect(t[0]).toEqual({ data: '2026-09-30', descricao: 'Início da tramitação eletrônica.' })
    expect(t.every((a) => !/<a |href=/.test(a.descricao))).toBe(true)
    expect(t.find((a) => a.descricao.startsWith('Publicado o Ato do Presidente'))).toBeTruthy()
    expect(eventoAlesp('Pauta de 1ª sessão (Emenda).')).toBe('outro')
    expect(eventoAlesp('Publicado no Diário Oficial em 01/10/2026.')).toBe('apresentacao')
    expect(
      eventoAlesp('Publicadas as Emendas de nºs 1 a 27, de autoria do Deputado Carlos Giannazi.'),
    ).toBe('outro')
  })

  it('pacote: ficha (etapa, regime, indexação, autor) e andamentos', () => {
    const r = lerPesquisaAlesp(sp('processos-numero')).itens[0]
    const p = pacoteAlesp(
      r,
      sp('processo-detalhes') as DetalhesAlesp,
      lerTramitacoesAlesp(sp('processo-tramitacoes')),
    )!
    expect(p.proposicao).toMatchObject({
      chave: 'alesp:processo:1100004484',
      uf: 'SP',
      sigla: 'PL',
      numero: 863,
      ano: 2026,
      etapa: 'Pauta',
      regime: 'prioridade',
      statusSimplificado: 'em_tramitacao',
      temasOficiais: ['LEI DO ORÇAMENTO ANUAL - LOA'],
      autoria: [{ papel: 'autor', nomeLivre: 'Governador' }],
    })
    expect(p.proposicao.ementa).toBe(
      'Orça a Receita e fixa a Despesa do Estado para o exercício de 2027.',
    )
    expect(p.tramitacoes[0].tipoEvento).toBe('apresentacao')
    expect(new Set(p.tramitacoes.map((t) => t.chave)).size).toBe(p.tramitacoes.length)
  })

  it('autor deputado vira parlamentar com partido', () => {
    const r = lerPesquisaAlesp(sp('processos')).itens[0]
    expect(autoresAlesp({}, r)).toEqual([
      {
        papel: 'autor',
        parlamentar: {
          chave: 'alesp:parlamentar:300614',
          nome: 'Carla Morando',
          uf: 'SP',
          casa: 'assembleia',
          partido: 'PSD',
        },
      },
    ])
  })

  it('conector: recentes do período, nova pela relevância e acompanhada pelo número, com ficha e andamentos', async () => {
    const buscar = async (url: string) => {
      if (url.includes('/tramitacoes/')) return sp('processo-tramitacoes')
      if (url.includes('/detalhes/')) return sp('processo-detalhes')
      if (url.includes('numero=')) return sp('processos-numero')
      return sp('processos')
    }
    const r = await criarConectorAlesp().coletar({
      desde: new Date('2026-10-19T03:00:00Z'),
      agora: new Date('2026-10-19T20:00:00Z'),
      acompanhadas: new Set(['SP:PL 863/2026']),
      descartadas: new Set<string>(),
      relevancia: (t) => (/Monitoramento Eletrônico/.test(t) ? 50 : 0),
      notaMinima: 40,
      maxNovas: 5,
      buscar,
    })
    expect(
      r.pacotes.map((p) => `${p.proposicao.sigla} ${p.proposicao.numero}/${p.proposicao.ano}`),
    ).toEqual(['PL 884/2026', 'PL 863/2026'])
    expect(r.amostra).toMatchObject({ recentes: 2, acompanhadasAchadas: '1/1' })
  })
})
