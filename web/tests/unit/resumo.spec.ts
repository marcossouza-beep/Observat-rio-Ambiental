import { describe, expect, it } from 'vitest'
import { montarAlerta, montarResumo, type DadosResumo, type LeiResumo } from '@/lib/resumo'

const lei = (id: number, extra: Partial<LeiResumo> = {}): LeiResumo => ({ id, rotulo: `PL nº ${id}/2026`, slug: `pl-${id}-2026`, temas: [], biomas: [], ...extra })
const leis = new Map([lei(1, { titulo: 'Licenciamento' }), lei(2, { temas: [10] }), lei(3, { biomas: [20] }), lei(4)].map((l) => [l.id, l]))

describe('alerta diário', () => {
  it('uma seção por lei seguida, eventos mais recentes primeiro', () => {
    const r = montarAlerta({ nome: 'Ana Souza' }, [
      {
        lei: leis.get(1)!,
        eventos: [
          { leiId: 1, tipo: 'votacao', descricao: 'Votação (Plenário): Aprovado o projeto', data: '2026-10-13T15:00:00.000Z' },
          { leiId: 1, tipo: 'pauta', descricao: 'Na pauta do Plenário', data: '2026-10-20T13:00:00.000Z', orgao: 'PLEN' },
        ],
      },
      { lei: leis.get(4)!, eventos: [] },
    ])!
    expect(r.titulo).toBe('Licenciamento andou')
    expect(r.assunto).toBe('Novidade: PL nº 1/2026')
    expect(r.paragrafos[0]).toMatch(/^Ana, a lei que você segue/)
    expect(r.secoes).toHaveLength(1)
    expect(r.secoes[0].itens[0]).toMatchObject({ texto: 'Entrou na pauta: Na pauta do Plenário', detalhe: '20/10 · PLEN' })
    expect(r.secoes[0].itens[1].texto).toBe('Votação: Aprovado o projeto')
  })
  it('sem novidade, não há e-mail', () => expect(montarAlerta({}, [{ lei: leis.get(1)!, eventos: [] }])).toBeNull())
})

describe('resumo semanal', () => {
  const base: DadosResumo = {
    inicio: '2026-10-09T20:00:00.000Z',
    fim: '2026-10-16T20:00:00.000Z',
    leis,
    pareceres: [{ leiId: 1, titulo: 'Parecer sobre o licenciamento', slug: 'pl-1-2026', carater: 'malefico', resumo: 'Enfraquece o licenciamento.' }],
    eventos: [
      { leiId: 1, tipo: 'votacao', descricao: 'Aprovado no Plenário', data: '2026-10-14T15:00:00.000Z' },
      { leiId: 2, tipo: 'urgencia', descricao: 'Urgência aprovada', data: '2026-10-13T15:00:00.000Z' },
      { leiId: 3, tipo: 'substitutivo', descricao: 'Substitutivo na CMADS', data: '2026-10-12T15:00:00.000Z' },
      { leiId: 4, tipo: 'veto', descricao: 'Veto parcial', data: '2026-10-12T15:00:00.000Z' },
    ],
    pauta: [{ leiId: 4, tipo: 'pauta', descricao: 'Na pauta', data: '2026-10-20T13:00:00.000Z', orgao: 'CMADS' }],
    votos: [{ parlamentarId: 7, nome: 'Fulano', partido: 'PT', uf: 'SP', voto: 'nao', leiId: 1, data: '2026-10-14T15:00:00.000Z' }],
    carater: new Map([[1, 'malefico']]),
    ufsDoBioma: new Map([[20, ['TO', 'GO']]]),
  }

  it('monta as seções na ordem certa, sem repetir lei', () => {
    const r = montarResumo({ nome: 'Ana', uf: 'TO', temas: [10], biomas: [], seguindo: [1], seguirParlamentares: [7] }, { ...base, nota: 'Semana de votações importantes.' })!
    expect(r.titulo).toBe('Resumo da semana · edição Norte · 09/10 a 16/10')
    expect(r.assunto).toMatch(/^Resumo da semana \(Norte\): /)
    expect(r.paragrafos[0]).toBe('Semana de votações importantes.')
    expect(r.secoes.map((s) => [s.titulo, s.itens.map((x) => x.texto)])).toEqual([
      ['Resumos prévios publicados', ['Parecer sobre o licenciamento']],
      ['Em votação nos próximos dias', ['PL nº 4/2026']],
      ['O que andou nas leis que você segue', ['Licenciamento (PL nº 1/2026)']],
      ['Do seu interesse', ['PL nº 2/2026']],
      ['Na sua região (Norte)', ['PL nº 3/2026']],
      ['Parlamentares que você segue', ['Fulano (PT-SP) votou Não · PL nº 1/2026']],
    ])
    expect(r.secoes[5].itens[0].detalhe).toBe('Resumo prévio: Maléfico · voto a favor da proteção')
  })

  it('sem nada para contar e sem nota, não sai e-mail', () => {
    const vazio = { ...base, pareceres: [], eventos: [], pauta: [], votos: [] }
    expect(montarResumo({ temas: [], biomas: [], seguindo: [], seguirParlamentares: [] }, vazio)).toBeNull()
    expect(montarResumo({ temas: [], biomas: [], seguindo: [], seguirParlamentares: [] }, { ...vazio, nota: 'Recesso parlamentar.' })).not.toBeNull()
  })

  describe('edição regional', () => {
    const regionais = new Map(
      [lei(11, { uf: 'PA' }), lei(12, { uf: 'TO' }), lei(13, { uf: 'SP' }), lei(14, { biomas: [30] }), lei(15, { biomas: [31] })].map((l) => [l.id, l]),
    )
    const dados: DadosResumo = {
      ...base,
      leis: regionais,
      pareceres: [],
      pauta: [],
      votos: [],
      eventos: [11, 12, 13, 14, 15].map((leiId) => ({ leiId, tipo: 'votacao' as const, descricao: `Votação ${leiId}`, data: '2026-10-14T15:00:00.000Z' })),
      // Bioma 30 cobre o Amazonas (Norte); bioma 31, só o Sul
      ufsDoBioma: new Map([
        [30, ['AM', 'MT']],
        [31, ['RS']],
      ]),
      notasRegionais: { Norte: 'Semana decisiva na Alepa.', Sul: 'Nota do Sul.' },
    }
    const pessoa = (uf?: string) => ({ nome: 'Bia', uf, temas: [], biomas: [], seguindo: [], seguirParlamentares: [] })

    it('quem é do Norte recebe a nota do Norte e as leis da região, o próprio estado primeiro', () => {
      const r = montarResumo(pessoa('TO'), dados)!
      expect(r.paragrafos.slice(0, 1)).toEqual(['Semana decisiva na Alepa.'])
      expect(r.paragrafos.join(' ')).not.toContain('Nota do Sul')
      const regiao = r.secoes.find((x) => x.titulo === 'Na sua região (Norte)')!
      expect(regiao.itens.map((i) => i.texto)).toEqual(['PL nº 12/2026', 'PL nº 11/2026', 'PL nº 14/2026'])
    })

    it('nota nacional vem antes da regional', () => {
      const r = montarResumo(pessoa('PA'), { ...dados, nota: 'Nota nacional.' })!
      expect(r.paragrafos.slice(0, 2)).toEqual(['Nota nacional.', 'Semana decisiva na Alepa.'])
    })

    it('sem estado: edição nacional, sem nota regional e sem bloco de região', () => {
      const r = montarResumo(pessoa(), dados)
      expect(r).toBeNull()
      const comNota = montarResumo(pessoa(), { ...dados, nota: 'Nota nacional.' })!
      expect(comNota.titulo).toBe('Resumo da semana · 09/10 a 16/10')
      expect(comNota.paragrafos).toEqual(['Nota nacional.', 'Bia, o que aconteceu nas leis ambientais esta semana.'])
    })

    it('só a nota regional já basta para sair o resumo da região', () => {
      const r = montarResumo(pessoa('RS'), { ...dados, eventos: [] })!
      expect(r.paragrafos[0]).toBe('Nota do Sul.')
      expect(r.assunto).toBe('Resumo da semana (Sul): nota do autor')
    })
  })
})
