/**
 * Fase 6 (Sul): Santa Catarina pelo e-Legis da Alesc, sobre páginas reais.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  autoresAlesc,
  eventoAlesc,
  lerFichaAlesc,
  lerListaAlesc,
  pacoteAlesc,
  statusAlesc,
  urlListaAlesc,
} from '@/coleta/alesc/mapear'
import { acompanhadasDeSantaCatarina, criarConectorAlesc } from '@/coleta/alesc/conector'

const dir = path.resolve(__dirname, '../fixtures/coleta/alesc')
const html = (f: string) =>
  JSON.parse(readFileSync(path.join(dir, `${f}.json`), 'utf8')).corpo.html as string

describe('Alesc (Santa Catarina)', () => {
  it('monta a lista com os filtros pedidos', () => {
    expect(urlListaAlesc()).toBe(
      'https://portalelegis.alesc.sc.gov.br/proposicoes/processo-legislativo',
    )
    expect(urlListaAlesc({ pagina: 2 })).toBe(
      'https://portalelegis.alesc.sc.gov.br/proposicoes/processo-legislativo?page=2',
    )
    expect(urlListaAlesc({ sigla: 'PL', numero: 640, ano: 2026 })).toBe(
      'https://portalelegis.alesc.sc.gov.br/proposicoes/processo-legislativo?tipoPropositura=1&numeroPropositura=640&ano=2026',
    )
  })

  it('lê os cartões: número, ementa, entrada, autoria, setor e situação; e o total de páginas', () => {
    const l = lerListaAlesc(html('processo-legislativo'))
    expect(l.paginas).toBe(3512)
    expect(l.cartoes).toHaveLength(10)
    expect(l.cartoes[0]).toEqual({
      id: 'NQeb8',
      sigla: 'PL',
      numero: 640,
      ano: 2026,
      ementa:
        'Altera a Lei Estadual nº 19.720, de 21 de janeiro de 2026, para incluir o Município de Ouro na Rota das Oliveiras do Estado de Santa Catarina.',
      entrada: '2026-10-07',
      autores: ['Deputado Altair Silva'],
      setor: 'Comissão de Constituição e Justiça',
      situacao: 'Aguardando apreciação pela Comissão',
    })
    expect(lerListaAlesc(html('processo-legislativo-p2')).cartoes[0]).toMatchObject({
      numero: 630,
      entrada: '2026-09-29',
    })
  })

  it('lê a ficha: regime, matéria e a linha do tempo com setores', () => {
    const f = lerFichaAlesc(html('tramitacoes-NQeb8'))
    expect(f.regime).toBe('Ordinário')
    expect(f.materia).toBe('Educação, cultura e esportes')
    expect(f.andamentos).toHaveLength(8)
    expect(f.andamentos[3]).toEqual({
      data: '2026-10-08',
      descricao: 'Lido no Expediente',
      de: 'Diretoria Legislativa',
      para: 'Coordenadoria de Expediente',
    })
  })

  it('pacote: só "Lido no Expediente" é apresentação; chaves únicas; tema oficial', () => {
    const c = lerListaAlesc(html('processo-legislativo')).cartoes[0]
    const p = pacoteAlesc(c, lerFichaAlesc(html('tramitacoes-NQeb8')))
    expect(p.proposicao).toMatchObject({
      chave: 'alesc:proposicao:NQeb8',
      uf: 'SC',
      etapa: 'Comissão de Constituição e Justiça',
      ultimaMovimentacao: '2026-10-13',
      temasOficiais: ['Educação, cultura e esportes'],
    })
    expect(
      p.tramitacoes.filter((t) => t.tipoEvento === 'apresentacao').map((t) => t.descricao),
    ).toEqual(['Lido no Expediente (Diretoria Legislativa → Coordenadoria de Expediente)'])
    expect(new Set(p.tramitacoes.map((t) => t.chave)).size).toBe(p.tramitacoes.length)
    expect(eventoAlesc('Aguardando leitura no Expediente')).toBe('outro')
  })

  it('autores e situação', () => {
    expect(autoresAlesc(['Deputada Paulinha', 'Governador do Estado'])).toEqual([
      {
        papel: 'autor',
        parlamentar: {
          chave: 'alesc:parlamentar:paulinha',
          nome: 'Paulinha',
          uf: 'SC',
          casa: 'assembleia',
        },
      },
      { papel: 'autor', nomeLivre: 'Governador do Estado' },
    ])
    expect(statusAlesc('Transformado em Lei')).toBe('norma')
    expect(statusAlesc('Arquivado')).toBe('arquivada')
    expect(statusAlesc('Aguardando apreciação pela Comissão')).toBe('em_tramitacao')
  })

  it('acompanhadas de Santa Catarina pelo número no estado', () => {
    expect(
      acompanhadasDeSantaCatarina(new Set(['SC:PL 640/2026', 'SC:MOC 1/2026', 'PR:PL 1/2026'])),
    ).toEqual([{ sigla: 'PL', numero: 640, ano: 2026 }])
  })

  it('conector: páginas até sair do período, nova pela relevância, acompanhada pelo número', async () => {
    const lidas: string[] = []
    const obter = async (url: string) => {
      lidas.push(url)
      if (url.includes('/tramitacoes')) return html('tramitacoes-NQeb8')
      if (url.includes('page=2')) return html('processo-legislativo-p2')
      return html('processo-legislativo')
    }
    const r = await criarConectorAlesc({ obter }).coletar({
      desde: new Date('2026-10-02T03:00:00Z'),
      agora: new Date('2026-10-08T12:00:00Z'),
      acompanhadas: new Set(['SC:PL 632/2026']),
      descartadas: new Set<string>(),
      relevancia: (t) => (/Oliveiras/.test(t) ? 50 : 0),
      notaMinima: 40,
      maxNovas: 5,
      buscar: async () => ({}),
    })
    // A primeira página já tem entradas antes do período: não lê a segunda
    expect(
      lidas.filter((u) => u.includes('processo-legislativo') && !u.includes('numeroPropositura')),
    ).toHaveLength(1)
    expect(
      r.pacotes.map((p) => `${p.proposicao.sigla} ${p.proposicao.numero}/${p.proposicao.ano}`),
    ).toEqual(['PL 640/2026', 'PL 632/2026'])
    expect(r.amostra).toMatchObject({ recentes: 2, acompanhadasAchadas: '1/1' })
  })
})
