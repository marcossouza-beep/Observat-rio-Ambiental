/**
 * Fase 6 (Nordeste): Bahia pelo Diário do Legislativo (EGBA) e Ceará pelo expediente e pela lista de proposições da
 * Alece, sobre edições e páginas reais.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  edicoesEgba,
  eventoDaMencao,
  materiasDoDiario,
  mencoesDaMateria,
  pacoteDoProjetoAlba,
  projetoDaMateria,
  type MateriaAlba,
} from '@/coleta/alba/mapear'
import { criarConectorAlba } from '@/coleta/alba/conector'
import {
  autorAlece,
  consertarUtf8,
  eventoAlece,
  leiturasDoExpediente,
  pacoteDaLeitura,
  pacoteDoRegistro,
  paginasDaLista,
  registrosDaLista,
  sessoesDoHistorico,
  statusAlece,
  urlFicha,
  urlLista,
} from '@/coleta/alece/mapear'
import { acharRegistro, acompanhadasDoCeara, criarConectorAlece } from '@/coleta/alece/conector'
import { extrairTextoPdf } from '@/coleta/textos'

const dir = path.resolve(__dirname, '../fixtures/coleta')
const json = (f: string) => JSON.parse(readFileSync(path.join(dir, f), 'utf8'))
const html = (f: string) => json(f).corpo.html as string
const ctx = (
  acompanhadas: string[],
  relevancia: (t: string) => number = () => 0,
  buscar: (u: string) => Promise<unknown> = async () => ({}),
) => ({
  desde: new Date('2026-10-15T00:00:00Z'),
  agora: new Date('2026-10-16T12:00:00Z'),
  acompanhadas: new Set(acompanhadas),
  descartadas: new Set<string>(),
  relevancia,
  notaMinima: 40,
  maxNovas: 5,
  buscar,
})

describe('Diário do Legislativo da Bahia', () => {
  const pdf = readFileSync(path.join(dir, 'alba', 'edicao-22706.pdf'))
  let materias: MateriaAlba[] = []
  beforeAll(async () => {
    materias = materiasDoDiario((await extrairTextoPdf(new Uint8Array(pdf))).texto)
  }, 60_000)

  it('lê a lista de edições da API da EGBA', () => {
    const eds = edicoesEgba(json('alba/ultimas-edicoes.json').corpo)
    expect(eds.length).toBeGreaterThan(20)
    expect(eds[0]).toEqual({
      id: 22706,
      numero: 24463,
      data: '2026-10-16',
      url: 'https://egbanet.egba.ba.gov.br/alba/portal/edicoes/download/22706',
      suplemento: false,
    })
    expect(edicoesEgba({ erro: true })).toEqual([])
  })

  it('separa as matérias pelos marcadores e tira sumário e cabeçalho de página', () => {
    expect(materias.length).toBe(9)
    expect(materias.every((m) => !/�{3}|<#E\.G\.B/.test(m.texto))).toBe(true)
  })

  it('acha os dois projetos do expediente despachado pela Presidência, com ementa, autor e comissões', () => {
    const ps = materias.map(projetoDaMateria).filter((p) => !!p)
    expect(ps.map((p) => `${p.sigla} ${p.numero}/${p.ano}`)).toEqual([
      'PL 26393/2026',
      'PL 26401/2026',
    ])
    const [a, b] = ps
    expect(a.ementa).toMatch(
      /^Institui em todo território do Estado da Bahia, o direito a meia-entrada .+ lazer\.$/,
    )
    expect(a.autor?.parlamentar).toMatchObject({
      chave: 'alba:parlamentar:felipe-duarte',
      nome: 'Felipe Duarte',
      uf: 'BA',
    })
    expect(a.comissoes).toMatch(/^Constituição e Justiça; Educação/)
    expect(a.texto).toMatch(/Sala das Sessões, 30 de março de 2026/)
    // Autor no cabeçalho ("DEPUTADA CLÁUDIA OLIVEIRA - Declara..."), fora da ementa
    expect(b.ementa).toBe(
      'Declara de Utilidade Pública Estadual o INSTITUTO AGANJU, com sede e foro no Município de Itapebi, Estado da Bahia.',
    )
    expect(b.autor?.parlamentar?.nome).toBe('Cláudia Oliveira')
    expect(b.comissoes).toBe('Constituição e Justiça')
  })

  it('monta o pacote: apresentação, distribuição às comissões e texto original', () => {
    const p = projetoDaMateria(materias.find((m) => projetoDaMateria(m))!)!
    const pac = pacoteDoProjetoAlba(p, edicoesEgba(json('alba/ultimas-edicoes.json').corpo)[0])
    expect(pac.proposicao).toMatchObject({
      chave: 'alba:PL-26393-2026',
      esfera: 'estadual',
      uf: 'BA',
      casa: 'assembleia',
      dataApresentacao: '2026-10-16',
      etapa: 'Comissões',
    })
    expect(pac.tramitacoes.map((t) => t.tipoEvento)).toEqual(['apresentacao', 'outro'])
    expect(pac.versoes[0]).toMatchObject({
      tipo: 'original',
      url: 'https://egbanet.egba.ba.gov.br/alba/portal/edicoes/download/22706',
    })
  })

  it('matéria que cita projeto no título vira andamento; o cabeçalho do próprio projeto não', () => {
    const m = {
      id: 1,
      texto:
        'PARECER DA COMISSÃO DE CONSTITUIÇÃO E JUSTIÇA AO PROJETO DE LEI Nº 26.393/2026\nVoto favorável.',
    }
    const [a] = mencoesDaMateria(m)
    expect(a).toMatchObject({ sigla: 'PL', numero: 26393, ano: 2026 })
    const e = eventoDaMencao(a, m, {
      id: 9,
      numero: 24470,
      data: '2026-10-23',
      url: 'u',
      suplemento: false,
    })
    expect(e.alvo).toMatchObject({
      chaves: ['alba:PL-26393-2026'],
      identificacoes: ['PL 26393/2026'],
      uf: 'BA',
    })
    expect(e.tramitacoes[0].tipoEvento).toBe('parecer_relator')
    expect(mencoesDaMateria(materias.find((x) => projetoDaMateria(x))!)).toEqual([])
  })

  it('conector: só edições do período; nova entra pela relevância, acompanhada sempre', async () => {
    const buscar = async () => json('alba/ultimas-edicoes.json').corpo
    const baixar = async () => pdf
    const novas = await criarConectorAlba({ baixar }).coletar(
      ctx([], (t) => (/Espectro Autista/.test(t) ? 50 : 0), buscar),
    )
    expect(novas.amostra).toMatchObject({ edicoes: [24462, 24463], projetosLidos: 4 })
    expect(novas.pacotes.map((p) => p.proposicao.chave)).toEqual(['alba:PL-26393-2026'])
    const acomp = await criarConectorAlba({ baixar }).coletar(
      ctx(['BA:PL 26401/2026'], () => 0, buscar),
    )
    expect(acomp.pacotes.map((p) => p.proposicao.chave)).toEqual(['alba:PL-26401-2026'])
  })
})

describe('Alece (Ceará)', () => {
  const pagina1 = consertarUtf8(html('alece/projetos-lei-tramitando.json'))

  it('lê as sessões do histórico do expediente, das mais novas para as mais antigas', () => {
    const ss = sessoesDoHistorico(html('alece/expediente-historico.json'))
    expect(ss.length).toBeGreaterThan(30)
    expect(ss[0]).toMatchObject({
      id: 354,
      data: '2026-10-15',
      url: 'https://www.al.ce.gov.br/legislativo/expediente-texto/354',
    })
    expect(ss[1]).toMatchObject({ id: 357, data: '2026-10-15' })
    expect(ss[1].resumo).toMatch(/SESSÃO EXTRAORDINÁRIA/)
  })

  it('separa as matérias lidas: projetos de lei entram, indicações e correspondências não', () => {
    const ls = leiturasDoExpediente(html('alece/expediente-texto.json'))
    expect(ls.map((l) => `${l.sigla} ${l.numero}/${l.ano}`)).toEqual(
      [592, 593, 594, 595, 596, 597, 598, 599].map((n) => `PL ${n}/2026`),
    )
    expect(ls[1]).toEqual({
      sigla: 'PL',
      numero: 593,
      ano: 2026,
      autor: 'Deputado Romeu Aldigueri',
      ementa:
        'Institui o Programa Estadual Cidade Mais Segura para Mulheres e estabelece diretrizes para a promoção da segurança urbana com perspectiva de gênero, no âmbito do Estado do Ceará.',
    })
  })

  it('mensagem do Executivo vira MSG com a ementa do projeto, mesmo com o texto colado', () => {
    const t =
      '<p>EXPEDIENTE13.10.2026LEITURA DE MENSAGENS N.º:86/2026 - Autoria do Poder Executivo - Projeto de Lei oriundo da Mensagem n.º 9577/2026 - Autoriza a abertura de crédito especial ao orçamento anual do Estado.87/2026 - Autoria do Poder Executivo - Projeto de Lei oriundo da Mensagem n.º 9578/2026 - Institui a Estratégia Estadual de Educação Financeira.LEITURA DE REQUERIMENTOS:Foram registrados os de n.º 2533/2026 a 2535/2026.</p> Mapa do site'
    expect(leiturasDoExpediente(t)).toEqual([
      {
        sigla: 'MSG',
        numero: 86,
        ano: 2026,
        autor: 'Poder Executivo',
        ementa: 'Autoriza a abertura de crédito especial ao orçamento anual do Estado.',
      },
      {
        sigla: 'MSG',
        numero: 87,
        ano: 2026,
        autor: 'Poder Executivo',
        ementa: 'Institui a Estratégia Estadual de Educação Financeira.',
      },
    ])
    expect(autorAlece('Poder Executivo')).toEqual({ papel: 'autor', nomeLivre: 'Poder Executivo' })
  })

  it('pacote da leitura: apresentação no expediente, autor parlamentar e a ficha em PDF', () => {
    const s = sessoesDoHistorico(html('alece/expediente-historico.json'))[0]
    const p = pacoteDaLeitura(
      leiturasDoExpediente(html('alece/expediente-texto.json'))[1],
      s,
      'Art. 1º ...',
    )
    expect(p.proposicao).toMatchObject({
      chave: 'alece:PL-593-2026',
      uf: 'CE',
      dataApresentacao: '2026-10-15',
      urlInteiroTeor: 'https://www2.al.ce.gov.br/legislativo/tramit2026/pl593_26.pdf',
    })
    expect(p.proposicao.autoria?.[0].parlamentar).toMatchObject({
      chave: 'alece:parlamentar:romeu-aldigueri',
      nome: 'Romeu Aldigueri',
      uf: 'CE',
    })
    expect(p.tramitacoes[0]).toMatchObject({
      tipoEvento: 'apresentacao',
      descricao: 'Leitura no Expediente',
    })
    expect(p.versoes[0]).toMatchObject({ tipo: 'original', texto: 'Art. 1º ...' })
    expect(urlFicha('PL', 1, 2023)).toBe(
      'https://www2.al.ce.gov.br/legislativo/tramit2023/pl1_23.htm',
    )
  })

  it('lê os registros da lista do www2, com o histórico inteiro e acentos certos (UTF-8 dentro de ISO-8859-1)', () => {
    const rs = registrosDaLista(pagina1)
    expect(rs).toHaveLength(20)
    expect(paginasDaLista(pagina1)).toBe(126)
    expect(rs[0]).toMatchObject({
      numero: 1,
      ano: 2023,
      autor: 'RENATO ROSENO',
      entrada: '2023-02-02',
      leitura: '2023-02-07',
      comissoes: 'CCJR/CVTDU/CTASP',
      localizacao: 'CCJR',
      obs: 'TRAMITANDO',
    })
    expect(rs[0].urlTexto).toBe('https://www2.al.ce.gov.br/legislativo/tramit2023/pl1_23.htm')
    expect(rs[0].andamentos.at(-1)).toEqual({
      data: '2026-03-17',
      descricao:
        'Reunião Extraordinária da Mesa Diretora, relator Deputado De Assis Diniz, parecer favorável com supressão ao projeto / Aprovado'.replace(
          /^/,
          '34.ª ',
        ),
    })
    expect(rs.find((r) => r.numero === 2 && r.ano === 2025)?.autor).toBe('JÔ FARIAS')
    expect(
      autorAlece('RENATO ROSENO, COAUTORIA GABRIELA AGUIAR E FERNANDO HUGO')?.parlamentar?.nome,
    ).toBe('Renato Roseno')
  })

  it('pacote do registro: andamentos classificados, urgência, situação e local', () => {
    const p = pacoteDoRegistro(registrosDaLista(pagina1)[0], 'PL')
    expect(p.proposicao).toMatchObject({
      chave: 'alece:PL-1-2023',
      regime: 'urgencia',
      etapa: 'CCJR',
      statusSimplificado: 'em_tramitacao',
      ultimaMovimentacao: '2026-03-17',
    })
    expect(p.tramitacoes.map((t) => t.tipoEvento)).toEqual([
      'apresentacao',
      'apresentacao',
      'outro',
      'urgencia',
      'parecer_relator',
    ])
    expect(new Set(p.tramitacoes.map((t) => t.chave)).size).toBe(5)
    expect(eventoAlece('Comissão de Constituição, Justiça e Redação')).toBe('outro')
    expect(statusAlece({ lei: '19.200', veto: '', obs: 'APROVADO', autografo: '1/26' })).toBe(
      'norma',
    )
    expect(statusAlece({ lei: '', veto: '', obs: 'ARQUIVADO', autografo: '' })).toBe('arquivada')
  })

  it('acha o registro por busca binária nas páginas em ordem de número', async () => {
    // Cinco páginas sintéticas no formato real (dois registros por página)
    const bloco = pagina1.split(/(?=<b>N&ordm; do Proj\.:<\/b>)/)
    const modelo = bloco[1]
    const cab = bloco[0].replace(/gina 1 de 126/, 'gina 1 de 5')
    const nums = [
      [1, 2023],
      [1, 2026],
      [2, 2024],
      [3, 2023],
      [3, 2026],
      [4, 2025],
      [5, 2026],
      [6, 2023],
      [6, 2026],
      [7, 2024],
    ]
    const paginas = new Map<number, string>()
    for (let p = 1; p <= 5; p++)
      paginas.set(
        p,
        cab +
          nums
            .slice((p - 1) * 2, p * 2)
            .map(([n, a]) =>
              modelo.replace(
                /<font face='Verdana' size='1'>1\/23 <\/font>/,
                `<font face='Verdana' size='1'>${n}/${String(a).slice(2)} </font>`,
              ),
            )
            .join(''),
      )
    const lidas: number[] = []
    const pagina = async (p: number) => (lidas.push(p), paginas.get(p) || '')
    expect(await acharRegistro(pagina, { sigla: 'PL', numero: 6, ano: 2023 })).toMatchObject({
      numero: 6,
      ano: 2023,
    })
    expect(lidas.length).toBeLessThanOrEqual(4)
    expect(await acharRegistro(pagina, { sigla: 'PL', numero: 2, ano: 2026 })).toBeNull()
    expect(urlLista('PL', 'T', 3)).toBe(
      'https://www2.al.ce.gov.br/legislativo/proposicoes/numero.php?nome=31_legislatura&tabela=projeto_lei&opcao=T&absolutepage=3',
    )
  })

  it('acompanhadas do Ceará pela chave ou pelo número no estado', () => {
    expect(
      acompanhadasDoCeara(
        new Set([
          'alece:PL-593-2026',
          'CE:MSG 88/2026',
          'CE:PL 593/2026',
          'PA:PL 1/2026',
          'PL 12/2026',
        ]),
      ),
    ).toEqual([
      { sigla: 'PL', numero: 593, ano: 2026 },
      { sigla: 'MSG', numero: 88, ano: 2026 },
    ])
  })

  it('conector: sessões do período, nova pela relevância, acompanhada achada na lista', async () => {
    const obter = async (url: string) => {
      if (url.endsWith('/expediente-historico')) return html('alece/expediente-historico.json')
      if (url.includes('/expediente-texto/354')) return html('alece/expediente-texto.json')
      if (url.includes('/expediente-texto/')) return '<p>EXPEDIENTE15.10.2026</p> Mapa do site'
      if (url.includes('numero.php') && url.includes('opcao=T') && !url.includes('absolutepage'))
        return pagina1
      return '<html></html>'
    }
    const baixar = async () => {
      throw new Error('HTTP 404')
    }
    const r = await criarConectorAlece({ obter, baixar }).coletar(
      ctx(['CE:PL 1/2023'], (t) => (/Segura para Mulheres/.test(t) ? 50 : 0)),
    )
    expect(r.amostra).toMatchObject({
      sessoes: ['2026-10-15', '2026-10-15'],
      materiasLidas: 8,
      acompanhadasAchadas: '1/1',
    })
    expect(r.pacotes.map((p) => p.proposicao.chave).sort()).toEqual([
      'alece:PL-1-2023',
      'alece:PL-593-2026',
    ])
    // Sem a ficha publicada, a versão fica só com o endereço
    expect(r.pacotes.find((p) => p.proposicao.numero === 593)!.versoes[0].texto).toBeUndefined()
  })
})
