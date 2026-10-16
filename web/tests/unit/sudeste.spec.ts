/**
 * Fase 6 (Sudeste): Minas Gerais pela API de dados abertos da ALMG, sobre respostas reais.
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
