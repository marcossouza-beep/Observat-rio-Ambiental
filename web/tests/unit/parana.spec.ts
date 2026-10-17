/**
 * Fase 6 (Sul): Paraná pela ordem do dia da Alep, sobre a página inicial e os PDFs reais.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  autoresAlep,
  eventoDoItem,
  lerOrdemAlep,
  ordensDaInicial,
  pacoteDoItem,
} from '@/coleta/alep/mapear'
import { criarConectorAlep } from '@/coleta/alep/conector'
import { extrairTextoPdf } from '@/coleta/textos'
import { ErroFormato } from '@/coleta/tipos'
import type { ContextoColeta } from '@/coleta/conector'

const dir = path.resolve(__dirname, '../fixtures/coleta/alep')
const inicial = () =>
  JSON.parse(readFileSync(path.join(dir, 'inicio.json'), 'utf8')).corpo.html as string
const pdf = (n: number) => readFileSync(path.join(dir, `ordem-${n}.pdf`))
const texto = async (n: number) => (await extrairTextoPdf(new Uint8Array(pdf(n)))).texto

describe('Alep (Paraná)', () => {
  it('lê na página inicial os cartões da ordem do dia (título e PDF)', () => {
    const o = ordensDaInicial(inicial())
    expect(o).toHaveLength(5)
    expect(o[0]).toEqual({
      titulo: '13ª SESSÃO EXTRAORDINÁRIA',
      url: 'https://storage2.assembleia.pr.leg.br/file/public-media/ordem/arquivos/mvb35i7k_16ac.pdf',
    })
    expect(o.every((x) => x.url.endsWith('.pdf'))).toBe(true)
    expect(() => ordensDaInicial('<html></html>')).toThrow(ErroFormato)
  })

  it('lê a ordem do dia: sessão, data e itens com etapa, número, autoria, ementa e pareceres', async () => {
    const o = lerOrdemAlep(await texto(2))
    expect(o.sessao).toBe('86ª Sessão Ordinária')
    expect(o.data).toBe('2026-10-19')
    expect(o.itens.length).toBeGreaterThanOrEqual(7)
    expect(o.itens[0]).toEqual({
      item: 1,
      etapa: '1º Turno',
      sigla: 'PL',
      numero: 630,
      ano: 2025,
      autores: ['Deputada Ana Júlia', 'Deputada Luciana Rafagnin'],
      ementa:
        'Altera o art. 235, 237 e inclui o art. 237-A da Seção II, Capítulo VII da Lei 21.926/2024, Código Estadual da Mulher Paranaense a fim de instituir a Campanha Agosto Dourado - mês de incentivo ao aleitamento humano.',
      pareceres: [
        'Parecer favorável: Comissão de Constituição e Justiça; Comissão de Defesa dos Direitos da Mulher.',
      ],
    })
    // Número com ponto, autoria institucional com ofício, item que ainda aguarda parecer
    const tj = o.itens[1]
    expect(tj).toMatchObject({ numero: 1016, ano: 2025, autores: ['Tribunal de Justiça'] })
    expect(tj.ementa).toBe(
      'Estabelece critérios para a cobrança dos emolumentos referentes ao foro extrajudicial do Estado do Paraná.',
    )
    expect(tj.pareceres).toContain('Aguardando parecer de Comissão.')
    // O título da seção seguinte não entra na ementa nem no parecer
    expect(o.itens[2].pareceres.join(' ')).not.toMatch(/PROPOSI/)
    expect(o.itens[3]).toMatchObject({ etapa: 'Turno Único', numero: 596, ano: 2026 })
    // O cabeçalho repetido nas páginas seguintes não entra no item anterior
    expect(o.itens.map((i) => i.ementa).join(' ')).not.toMatch(/Centro Legislativo/)
  })

  it('redação final e sessão extraordinária; sessão só com audiência não tem itens', async () => {
    const e = lerOrdemAlep(await texto(1))
    expect(e.sessao).toBe('13ª Sessão Extraordinária')
    expect(e.itens[0]).toMatchObject({
      etapa: 'Redação Final',
      sigla: 'PL',
      numero: 678,
      ano: 2026,
    })
    const a = lerOrdemAlep(await texto(3))
    expect(a).toMatchObject({ sessao: '85ª Sessão Ordinária', data: '2026-10-13', itens: [] })
    expect(() => lerOrdemAlep('texto qualquer')).toThrow(ErroFormato)
  })

  it('autoria: deputado vira parlamentar do PR; instituição fica com o nome', () => {
    expect(autoresAlep(['Deputado Cobra Repórter', 'Tribunal de Justiça'])).toEqual([
      {
        papel: 'autor',
        parlamentar: {
          chave: 'alep:parlamentar:cobra-reporter',
          nome: 'Cobra Repórter',
          uf: 'PR',
          casa: 'assembleia',
        },
      },
      { papel: 'coautor', nomeLivre: 'Tribunal de Justiça' },
    ])
  })

  it('item → pacote novo (sem data de apresentação inventada) e evento "pauta" para acompanhada', async () => {
    const o = lerOrdemAlep(await texto(2))
    const url = 'https://storage2.assembleia.pr.leg.br/file/public-media/ordem/arquivos/x.pdf'
    const p = pacoteDoItem(o, o.itens[0], url)
    expect(p.proposicao).toMatchObject({
      chave: 'alep:PL-630-2025',
      esfera: 'estadual',
      uf: 'PR',
      ultimaMovimentacao: '2026-10-19',
      urlFonte: url,
    })
    expect(p.proposicao.dataApresentacao).toBeUndefined()
    expect(p.tramitacoes).toEqual([
      expect.objectContaining({
        chave: 'alep:ordem:2026-10-19:86-sessao-ordinaria:PL-630-2025',
        tipoEvento: 'pauta',
        data: '2026-10-19',
        descricao: expect.stringMatching(
          /^Na ordem do dia da 86ª Sessão Ordinária \(1º turno\)\. Parecer favorável/,
        ),
      }),
    ])
    const ev = eventoDoItem(o, o.itens[0], url)
    expect(ev.alvo).toEqual({
      chaves: ['alep:PL-630-2025'],
      identificacoes: ['PL 630/2025'],
      esfera: 'estadual',
      uf: 'PR',
    })
  })

  it('conector: acompanhada vira andamento; nova só com relevância; PDF quebrado vira aviso', async () => {
    const urls = ordensDaInicial(inicial()).map((o) => o.url)
    const arquivo: Record<string, number> = { [urls[0]]: 1, [urls[1]]: 2 }
    const c = criarConectorAlep({
      obter: async () => inicial(),
      baixar: async (u) => {
        if (!arquivo[u]) throw new Error('HTTP 404')
        return pdf(arquivo[u])
      },
    })
    const ctx = {
      desde: new Date('2026-10-10'),
      agora: new Date('2026-10-17T12:00:00Z'),
      acompanhadas: new Set(['PR:PL 630/2025']),
      descartadas: new Set<string>(),
      relevancia: (t: string) => (/Peixe/i.test(t) ? 10 : 0),
      notaMinima: 5,
      maxNovas: 10,
      buscar: async () => null,
    } as unknown as ContextoColeta
    const r = await c.coletar(ctx)
    // O PL 630/2025 está nas duas sessões do dia 19 (2º turno na extraordinária, 1º na ordinária)
    expect(r.eventos!.map((e) => e.tramitacoes[0].descricao.slice(0, 60))).toEqual([
      'Na ordem do dia da 13ª Sessão Extraordinária (2º turno). Par',
      'Na ordem do dia da 86ª Sessão Ordinária (1º turno). Parecer ',
    ])
    expect(r.pacotes.map((p) => p.proposicao.chave)).toEqual(['alep:PL-596-2026'])
    expect(r.amostra).toMatchObject({
      sessoes: ['13ª Sessão Extraordinária (2026-10-19)', '86ª Sessão Ordinária (2026-10-19)'],
    })
    expect(r.avisos.filter((a) => /HTTP 404/.test(a))).toHaveLength(3)
  })
})
