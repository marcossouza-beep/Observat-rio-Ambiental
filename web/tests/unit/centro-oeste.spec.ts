/**
 * Fase 6 (Centro-Oeste): Mato Grosso pela pesquisa de proposições da ALMT, sobre páginas reais.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { autorAlmt, eventoAlmt, eventoDoVeto, lerPesquisa, lerTramitacoes, pacoteAlmt, statusAlmt, urlPesquisa } from '@/coleta/almt/mapear'
import { acompanhadasDeMatoGrosso, criarConectorAlmt } from '@/coleta/almt/conector'

const dir = path.resolve(__dirname, '../fixtures/coleta/almt')
const html = (f: string) => JSON.parse(readFileSync(path.join(dir, `${f}.json`), 'utf8')).corpo.html as string

describe('ALMT (Mato Grosso)', () => {
  it('monta o endereço da pesquisa só com os filtros pedidos', () => {
    expect(urlPesquisa({ tipo: 1, ano: 2026, pagina: 3 })).toBe(
      'https://www.al.mt.gov.br/proposicao?almt_form_proposicao_search_proposicao%5BtipoPropositura%5D=1&almt_form_proposicao_search_proposicao%5Bano%5D=2026&page=3',
    )
    expect(urlPesquisa({ tipo: 1, numero: 7, ano: 2026 })).toContain('%5BnumeroPropositura%5D=7')
  })

  it('lê os cartões da pesquisa: tipo, número, autor, ementa, protocolo, data e PDF; e o total de páginas', () => {
    const r = lerPesquisa(html('proposicoes-pl-ano'))
    expect(r.paginas).toBe(118)
    expect(r.cartoes).toHaveLength(10)
    expect(r.cartoes[0]).toEqual({
      id: 170923,
      tipo: 'Projeto de lei',
      sigla: 'PL',
      numero: 1,
      ano: 2026,
      autor: 'Dep. Eduardo Botelho',
      ementa: 'ESTABELECE CRITÉRIOS PARA ENTREGA DOS RECURSOS AOS MUNICÍPIOS A TÍTULO DE TRANSFERÊNCIA VOLUNTÁRIA.',
      protocolo: '1/2026',
      data: '2026-01-13',
      pdf: 'https://www.al.mt.gov.br/storage/webdisco/cp/20260113165425121100.pdf',
    })
  })

  it('na lista geral, indicações, requerimentos e moções ficam de fora; veto entra como VET', () => {
    const r = lerPesquisa(html('proposicoes'))
    expect(r.brutos).toBe(10)
    expect(r.cartoes.map((c) => c.sigla)).toEqual(['VET', 'PLC', 'PEC', 'PDL', 'PL', 'PEC'])
  })

  it('veto vira andamento do projeto vetado', () => {
    const veto = lerPesquisa(html('proposicoes')).cartoes[0]
    const e = eventoDoVeto(veto)!
    expect(e.alvo).toEqual({ chaves: [], identificacoes: ['PL 864/2023'], esfera: 'estadual', uf: 'MT' })
    expect(e.tramitacoes[0]).toMatchObject({ tipoEvento: 'veto', data: '2026-02-11', descricao: 'Veto parcial nº 1/2026 (Mensagem nº 170/2025)' })
  })

  it('autor: deputado vira parlamentar; mensagem é do governo', () => {
    expect(autorAlmt('Dep. Fabio Tardin - Fabinho')?.parlamentar).toMatchObject({ chave: 'almt:parlamentar:fabio-tardin', nome: 'Fabio Tardin', uf: 'MT' })
    expect(autorAlmt('Mensagem nº 6/2026')).toEqual({ papel: 'autor', nomeLivre: 'Governo do Estado (Mensagem nº 6/2026)' })
    expect(autorAlmt('Lideranças Partidárias')).toEqual({ papel: 'autor', nomeLivre: 'Lideranças Partidárias' })
  })

  it('lê os andamentos, com o PDF do parecer, e reconhece a lei publicada', () => {
    const t = lerTramitacoes(html('tramitacoes-158899'))
    expect(t).toHaveLength(35)
    expect(t[0]).toEqual({ data: '2025-04-16', descricao: 'Lido: 20ª Sessão Ordinária (16/04/2025)' })
    expect(t.find((a) => a.documento)?.documento).toMatch(/\/storage\/webdisco\/reuniaocomissao\/.+\.pdf$/)
    expect(t.at(-1)?.descricao).toBe('Lei n° 13.196/2026 D.O. Estado(n° 29151 - 14/12/2026)')
    expect(statusAlmt(t)).toBe('norma')
    expect(statusAlmt(t.slice(0, -1))).toBe('aprovada')
  })

  it('classifica os andamentos: "cumprindo pauta" é prazo de emendas, não pauta de votação', () => {
    expect(eventoAlmt('Lido: 20ª Sessão Ordinária (16/04/2025)')).toBe('apresentacao')
    expect(eventoAlmt('Cumprindo pauta: 21ª Sessão Ordinária, 16/04/2025.')).toBe('outro')
    expect(eventoAlmt('Relator: Dep. Beto Dois a Um')).toBe('parecer_relator')
    expect(eventoAlmt('Aprov. em 2° votação: 84ª Sessão Ordinária (10/12/2025)')).toBe('aprovacao')
    expect(eventoAlmt('Aguardando Sanção Governamental')).toBe('aprovacao')
    expect(eventoAlmt('Lei n° 13.196/2026 D.O. Estado(n° 29151 - 14/12/2026)')).toBe('sancao')
    expect(eventoAlmt('Mantido: 36ª Sessão Ordinária (17/06/2026) Obs.: Ao arquivo.')).toBe('arquivamento')
  })

  it('pacote: andamentos com chave estável, situação, local e texto em PDF', () => {
    const c = lerPesquisa(html('proposicoes-pl-ano')).cartoes[0]
    const p = pacoteAlmt(c, lerTramitacoes(html('tramitacoes-158899')))
    expect(p.proposicao).toMatchObject({ chave: 'almt:proposicao:170923', uf: 'MT', esfera: 'estadual', sigla: 'PL', statusSimplificado: 'norma', ultimaMovimentacao: '2026-01-15' })
    expect(new Set(p.tramitacoes.map((t) => t.chave)).size).toBeGreaterThan(30)
    expect(p.versoes[0]).toMatchObject({ tipo: 'original', url: c.pdf })
    // Sem andamentos lidos, fica o protocolo como apresentação
    expect(pacoteAlmt(c).tramitacoes).toEqual([expect.objectContaining({ tipoEvento: 'apresentacao', data: '2026-01-13' })])
  })

  it('acompanhadas de Mato Grosso pelo número no estado', () => {
    expect(acompanhadasDeMatoGrosso(new Set(['MT:PL 1/2026', 'MT:IND 3/2026', 'CE:PL 1/2026', 'almt:proposicao:1']))).toEqual([{ sigla: 'PL', numero: 1, ano: 2026 }])
  })

  it('conector: lê o fim da lista de cada tipo, nova pela relevância, acompanhada pelo número', async () => {
    const lidas: string[] = []
    const obter = async (url: string) => {
      lidas.push(decodeURIComponent(url))
      if (url.includes('/tramitacoes')) return html('tramitacoes-172857')
      // A pesquisa por número devolve o cartão da proposta (aqui, a página com PL 1 a 10/2026)
      if (url.includes('numeroPropositura')) return html('proposicoes-pl-ano')
      if (url.includes('tipoPropositura%5D=1&')) return html('proposicoes-pl-ano')
      return '<html></html>'
    }
    const r = await criarConectorAlmt({ obter }).coletar({
      desde: new Date('2026-01-13T00:00:00Z'),
      agora: new Date('2026-03-16T12:00:00Z'),
      acompanhadas: new Set(['MT:PL 8/2026']),
      descartadas: new Set<string>(),
      relevancia: (t) => (/ODONTOLÓGICOS/.test(t) ? 50 : 0),
      notaMinima: 40,
      maxNovas: 5,
      buscar: async () => ({}),
    })
    // Página 1 (dá o total) e as 4 últimas do PL; os outros tipos, só a primeira
    expect(lidas.filter((u) => u.includes('[tipoPropositura]=1&') && !u.includes('numeroPropositura')).map((u) => /page=(\d+)/.exec(u)?.[1] || '1')).toEqual(['1', '118', '117', '116', '115'])
    // Nova: PL 2/2026 (relevante, protocolada no período). PL 8/2026 é de 05/01, fora das recentes, mas é acompanhada
    expect(r.pacotes.map((p) => `${p.proposicao.sigla} ${p.proposicao.numero}/${p.proposicao.ano}`)).toEqual(['PL 2/2026', 'PL 8/2026'])
    expect(r.pacotes[0].tramitacoes).toHaveLength(10)
    expect(r.amostra).toMatchObject({ acompanhadasAchadas: '1/1' })
    expect(lidas.some((u) => u.includes('[numeroPropositura]=8') && u.includes('[ano]=2026'))).toBe(true)
  })
})
