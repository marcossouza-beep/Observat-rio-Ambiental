/**
 * Fase 5 (Norte): Roraima pelo Diário da ALE-RR e Pará pelo Banco de Leis da Alepa, sobre edições e respostas reais.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { autografosDaEdicao, edicaoDe, eventoDoAutografo, pacoteDoProjeto, projetosDaEdicao, semCabecalhoDePagina } from '@/coleta/alerr/mapear'
import { limparEmenta, pacoteDaLei, siglaDaLei, type LeiAlepa } from '@/coleta/alepa/leis'
import { autorAlepa, lerPainel, pacoteAlepa, pedidoPainel, siglaAlepa, urlDetalhes } from '@/coleta/alepa/proposicoes'
import { criarConectorAlepa } from '@/coleta/alepa/conector'
import { eventoAlepa, lerDetalhesAlepa, pacoteDosDetalhes, statusAlepa } from '@/coleta/alepa/detalhes'
import { extrairTextoPdf } from '@/coleta/textos'

const dir = path.resolve(__dirname, '../fixtures/coleta')
const texto = async (ed: string) => (await extrairTextoPdf(new Uint8Array(readFileSync(path.join(dir, 'alerr', `ed-${ed}.pdf`))))).texto
const leis = (f: string) => JSON.parse(readFileSync(path.join(dir, 'alepa', `${f}.json`), 'utf8')).corpo.resultados as LeiAlepa[]

describe('Diário da ALE-RR', () => {
  let ed4747 = ''
  beforeAll(async () => {
    ed4747 = await texto('4747')
  }, 60_000)

  it('lê número e data da edição pelo título do arquivo', () => {
    expect(edicaoDe('DIARIO-ALE-RR-ED.-4747-13.10.2026', 'https://x/a.pdf')).toEqual({ numero: 4747, data: '2026-10-13', url: 'https://x/a.pdf' })
    expect(edicaoDe('Outro arquivo', 'https://x/b.pdf')).toBeNull()
  })

  it('acha os 10 projetos da edição 4747, em todos os formatos de cabeçalho, com ementa e autor', () => {
    const ps = projetosDaEdicao(ed4747)
    expect(ps.map((p) => `${p.sigla} ${p.numero}/${p.ano}`).sort()).toEqual(
      ['PL 149/2026', 'PL 150/2026', 'PL 151/2026', 'PL 152/2026', 'PL 153/2026', 'PL 154/2026', 'PL 155/2026', 'PL 156/2026', 'PDL 57/2026', 'PDL 59/2026'].sort(),
    )
    const pl150 = ps.find((p) => p.numero === 150 && p.sigla === 'PL')!
    expect(pl150.ementa).toMatch(/^Declara como Patrimônio Cultural Imaterial do Estado de Roraima o Festejo de Nossa Senhora do Livramento/)
    expect(pl150.autor?.parlamentar).toMatchObject({ nome: 'Armando Neto', uf: 'RR', casa: 'assembleia' })
    // "Nº 153, DE 25 DE SETEMBRO DE 2026." com a ementa na linha seguinte, de autoria do governo
    const pl153 = ps.find((p) => p.numero === 153)!
    expect(pl153.ementa).toMatch(/^Autoriza a permuta de imóvel público/)
    expect(pl153.autor?.nomeLivre).toBe('Francisco dos Santos Sampaio (Governador do Estado)')
    // O texto do projeto para antes da justificativa
    const pl149 = ps.find((p) => p.numero === 149)!
    expect(pl149.texto).toContain('Art. 1º Fica instituída a Política Estadual de Saúde Vocal')
    expect(pl149.texto).not.toContain('JUSTIFICATIVA')
  })

  it('não inventa projeto em edição só de atos administrativos', async () => {
    expect(projetosDaEdicao(await texto('4743'))).toEqual([])
  }, 60_000)

  it('tira o cabeçalho de página que cai no meio do texto', () => {
    expect(semCabecalhoDePagina('fim 6BOA VISTA, 13 DE OUTUBRO DE 2026DIÁRIO DA ALE/RR ED. Nº 4747 DIÁRIO DA ASSEMBLEIA LEGISLATIVA continua')).toBe('fim continua')
  })

  it('autógrafo publicado vira aprovação na proposta acompanhada', () => {
    // Sumário real da edição 4745
    const sumario = 'Superintendência Legislativa - Autógrafo do Projeto de Lei nº 157/2026 - Projeto de Lei Complementar nº 009/2026 - Projeto de Lei nº 139/2026'
    const a = autografosDaEdicao(sumario)
    expect(a).toEqual([{ sigla: 'PL', numero: 157, ano: 2026 }])
    const ev = eventoDoAutografo(a[0], { numero: 4745, data: '2026-10-08', url: 'https://x/4745.pdf' })
    expect(ev.alvo).toEqual({ chaves: ['alerr:PL-157-2026'], identificacoes: ['PL 157/2026'], esfera: 'estadual', uf: 'RR' })
    expect(ev.tramitacoes[0]).toMatchObject({ tipoEvento: 'aprovacao', data: '2026-10-08' })
  })

  it('pacote do projeto: estadual de RR, apresentação no diário e o texto como versão original', () => {
    const p = projetosDaEdicao(ed4747).find((x) => x.numero === 149)!
    const pk = pacoteDoProjeto(p, { numero: 4747, data: '2026-10-13', url: 'https://x/4747.pdf' })
    expect(pk.proposicao).toMatchObject({ chave: 'alerr:PL-149-2026', esfera: 'estadual', uf: 'RR', casa: 'assembleia', sigla: 'PL', numero: 149, statusSimplificado: 'em_tramitacao' })
    expect(pk.tramitacoes[0]).toMatchObject({ tipoEvento: 'apresentacao', data: '2026-10-13' })
    expect(pk.versoes[0].texto).toContain('Art. 1º')
  })
})

describe('Banco de Leis da Alepa', () => {
  it('sigla pelo tipo da norma', () => {
    expect(siglaDaLei('Lei Ordinária')).toBe('Lei')
    expect(siglaDaLei('Lei Complementar')).toBe('LC')
    expect(siglaDaLei('Emendas Constitucionais Estaduais')).toBe('EC')
    expect(siglaDaLei('Decreto Estadual')).toBeNull()
  })

  it('limpa a ementa das leis antigas (cabeçalho e anotações de alteração)', () => {
    expect(limparEmenta(leis('leis-numero')[0].ementa)).toBe('Dispõe sobre a Política Estadual do Meio Ambiente e dá outras providências.')
  })

  it('lei nova vira norma estadual do Pará, com o PDF oficial e a data do arquivo', () => {
    const apa = leis('leis-2026').find((l) => l.numero === '11665')!
    const p = pacoteDaLei(apa)!
    expect(p.proposicao).toMatchObject({ chave: 'alepa:lei:32817', esfera: 'estadual', uf: 'PA', sigla: 'Lei', numero: 11665, ano: 2026, statusSimplificado: 'norma', ultimaMovimentacao: '2026-09-01' })
    expect(p.proposicao.ementa).toMatch(/^Cria a Área de Proteção Ambiental Bacajaí/)
    expect(p.versoes[0]).toMatchObject({ tipo: 'norma', data: '2026-09-01', url: apa.link_pdf })
  })
})

describe('Proposições da Alepa (painel da pesquisa)', () => {
  const painel = (f: string) => JSON.parse(readFileSync(path.join(dir, 'alepa', `${f}.json`), 'utf8')).corpo.html as string

  it('lê os 10 projetos de lei mais novos com número, data, autor e ementa', () => {
    const r = lerPainel(painel('proposicoes-tipo-IdTipoProposicao'))
    expect(r.total).toBe(669)
    expect(r.cartoes).toHaveLength(10)
    expect(r.cartoes[0]).toMatchObject({ id: 16375, sigla: 'PL', numero: 669, ano: 2026, data: '2026-10-13', autor: 'DEP. DELEGADO NILTON NEVES' })
    expect(r.cartoes[0].ementa).toMatch(/^Institui o Programa Estadual "GELO PAI' DÉGUA"/)
  })

  it('a busca por "ambiental" traz a APA Bacajaí e o projeto de licenciamento', () => {
    const r = lerPainel(painel('proposicoes-texto-ambiental'))
    expect(r.total).toBe(18)
    expect(r.cartoes.find((c) => c.numero === 461)?.ementa).toMatch(/^Cria a Área de Proteção Ambiental Bacajaí/)
    expect(r.cartoes.find((c) => c.numero === 647)?.ementa).toMatch(/licenciamento ambiental/)
  })

  it('página só de indicações não é erro de formato (nenhum projeto)', () => {
    expect(lerPainel(painel('proposicoes-ano')).cartoes).toEqual([])
    expect(lerPainel('')).toEqual({ total: 0, cartoes: [] })
  })

  it('sigla, autor e pacote', () => {
    expect(siglaAlepa('PROJETO DE LEI ORDINÁRIA')).toBe('PL')
    expect(siglaAlepa('PROJETO DE LEI COMPLEMENTAR')).toBe('PLC')
    expect(siglaAlepa('INDICAÇÃO')).toBeNull()
    expect(autorAlepa('DEP. LÍVIA DUARTE')?.parlamentar).toMatchObject({ nome: 'Lívia Duarte', uf: 'PA', chave: 'alepa:parlamentar:livia-duarte' })
    expect(autorAlepa('PODER EXECUTIVO')).toEqual({ papel: 'autor', nomeLivre: 'Poder Executivo' })
    const c = lerPainel(painel('proposicoes-texto-ambiental')).cartoes.find((x) => x.numero === 461)!
    const p = pacoteAlepa(c)
    expect(p.proposicao).toMatchObject({ chave: 'alepa:proposicao:16099', esfera: 'estadual', uf: 'PA', sigla: 'PL', numero: 461, dataApresentacao: '2026-06-11' })
    expect(p.proposicao.urlFonte).toBe('https://www.alepa.pa.gov.br/Legislativo/DetalhesProposicao?IdProposicao=16099')
    expect(pedidoPainel(2026, { tipo: 3 })).toMatchObject({ 'model[Ano]': '2026', 'model[IdTipoProposicao]': '3', DXCallbackName: 'cbpProposicoes' })
  })
})

describe('Detalhes da proposição na Alepa', () => {
  const detalhes = (id: number) => lerDetalhesAlepa(JSON.parse(readFileSync(path.join(dir, 'alepa', `detalhes-${id}.json`), 'utf8')).corpo.html)

  it('APA Bacajaí: referências, 14 andamentos, 3 comissões com relator, plenário e a lei', () => {
    const d = detalhes(16099)
    expect(d).toMatchObject({ tipo: 'PROJETO DE LEI ORDINÁRIA', numero: 461, ano: 2026, autor: 'DEP. TORRINHO TORRES', situacao: 'ARQUIVADO', pdfProjeto: 'https://downloads.alepa.pa.gov.br/Projeto/16099.PDF' })
    expect(d.tramitacao).toHaveLength(14)
    expect(d.comissoes.map((c) => c.relator)).toEqual(['DEP. ERALDO PIMENTA', 'DEP. IRAN LIMA', 'DEP. MARIA DO CARMO'])
    expect(d.plenario).toEqual([
      { turno: 'TURNO ÚNICO', data: '2026-06-30T15:00:00.000Z', resultado: 'APROVADA' },
      { turno: 'REDAÇÃO FINAL', data: '2026-06-30T15:00:00.000Z', resultado: 'APROVADA' },
    ])
    expect(d.lei).toMatchObject({ numero: '11665', data: '2026-07-23T15:00:00.000Z', doe: '36729', dataDoe: '2026-08-12T15:00:00.000Z' })
    expect(statusAlepa(d)).toBe('norma')
  })

  it('pacote: ementa sem anotações do expediente, plenário sem repetição, lei como sanção, versões com PDF', () => {
    const p = pacoteDosDetalhes(16099, detalhes(16099))
    expect(p.proposicao.ementa).toBe('Cria a Área de Proteção Ambiental Bacajaí - APA Bacajaí, nos Municípios de Altamira e Senador José Porfírio, Estado do Pará, e dá outras providências.')
    expect(p.tramitacoes.filter((t) => /TURNO ÚNICO/.test(t.descricao)).map((t) => [t.descricao, t.tipoEvento])).toEqual([['TURNO ÚNICO: APROVADA', 'aprovacao']])
    expect(p.tramitacoes.at(-1)).toMatchObject({ tipoEvento: 'sancao', descricao: 'Transformado na Lei nº 11665 (DOE nº 36729, 12/08/2026)' })
    expect(p.tramitacoes.find((t) => t.descricao.startsWith('VOTADO NA COMISSÃO DE MEIO'))?.orgao).toBe('COMISSÃO DE MEIO AMBIENTE, RECURSOS HÍDRICOS E DESENVOLVIMENTO SUSTENTÁVEL')
    expect(p.versoes.map((v) => v.tipo)).toEqual(['original', 'parecer_relator', 'parecer_relator', 'parecer_relator', 'redacao_final', 'norma'])
    expect(p.proposicao.autoria?.find((a) => a.papel === 'relator' && a.orgao?.startsWith('COMISSÃO DE MEIO'))?.parlamentar?.nome).toBe('Maria do Carmo')
  })

  it('projeto recente: em tramitação, comissão sem parecer ainda não vira relator', () => {
    const d = detalhes(16347)
    expect(statusAlepa(d)).toBe('em_tramitacao')
    const p = pacoteDosDetalhes(16347, d)
    expect(p.tramitacoes).toHaveLength(3)
    expect(p.proposicao.autoria?.filter((a) => a.papel === 'relator')).toEqual([])
    expect(p.proposicao.etapa).toBe('COMISSÃO DE CONSTITUIÇÃO E JUSTIÇA E DE REDAÇÃO FINAL')
  })

  it('tipo de andamento', () => {
    expect(eventoAlepa('INCLUÍDO NA PAUTA DA 19ª SESSÃO ORDINÁRIA')).toBe('pauta')
    expect(eventoAlepa('VOTADO NA COMISSÃO DE MEIO AMBIENTE')).toBe('parecer_relator')
    expect(eventoAlepa('PUBLICADO NO AVULSO Nº: 71 PÁGINA: 02')).toBe('outro')
  })
})

describe('Conector da Alepa: endereço dos detalhes', () => {
  const html = (f: string) => JSON.parse(readFileSync(path.join(dir, 'alepa', `${f}.json`), 'utf8')).corpo.html as string
  const ctx = (acompanhadas: string[]) => ({
    desde: new Date('2026-10-15T00:00:00Z'),
    agora: new Date('2026-10-16T12:00:00Z'),
    acompanhadas: new Set(acompanhadas),
    descartadas: new Set<string>(),
    relevancia: () => 0,
    notaMinima: 40,
    maxNovas: 5,
    buscar: async () => ({}),
  })
  // Sem tipo e situação no endereço, a página real vem sem a tramitação
  const obter = async (url: string) => (url.includes('&tipo=') ? html('detalhes-16347') : html('detalhes-16347-so-id'))

  it('o cartão traz o endereço completo (tipo e situação)', () => {
    const c = lerPainel(html('proposicoes-tipo-IdTipoProposicao')).cartoes[0]
    expect(c.detalhes).toBe('https://www.alepa.pa.gov.br/Legislativo/DetalhesProposicao?IdProposicao=16375&tipo=PROJETO%20DE%20LEI%20ORDIN%C3%81RIA&situacao=0&decisao=-1&veto=-1')
    expect(urlDetalhes(16375, 'PL')).toBe(c.detalhes)
  })

  it('acompanhada fora da lista: lê o tipo e pede de novo com ele, e a tramitação vem', async () => {
    const r = await criarConectorAlepa({ postar: async () => '', obter }).coletar(ctx(['alepa:proposicao:16347']))
    expect(r.pacotes).toHaveLength(1)
    expect(r.pacotes[0].tramitacoes).toHaveLength(3)
  })
})
