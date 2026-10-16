/**
 * Fase 5 (Norte): Roraima pelo Diário da ALE-RR e Pará pelo Banco de Leis da Alepa, sobre edições e respostas reais.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { autografosDaEdicao, edicaoDe, eventoDoAutografo, pacoteDoProjeto, projetosDaEdicao, semCabecalhoDePagina } from '@/coleta/alerr/mapear'
import { limparEmenta, pacoteDaLei, siglaDaLei, type LeiAlepa } from '@/coleta/alepa/leis'
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
