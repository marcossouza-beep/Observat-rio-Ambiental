import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { eventoDoVeto, vetoDoResultado, vetosDoAno } from '@/coleta/congresso/mapear'
import { classificarAto, lerAto, numeroEAno, orgaoDoAto, siglaDoAto, vetoDaMensagem } from '@/coleta/dou/mapear'
import { mapearAgendaPlenarioSenado } from '@/coleta/senado/mapear'

const amostra = (nome: string) => JSON.parse(readFileSync(path.resolve(__dirname, '../fixtures/coleta', `${nome}.json`), 'utf8')).corpo
const modelo = (nome: string) => readFileSync(path.resolve(__dirname, '../fixtures/coleta/dou-modelo', nome), 'utf8')

describe('Congresso: vetos', () => {
  const vetos = vetosDoAno(amostra('senado/vetos-ano'))

  it('veto parcial vira andamento da proposta vetada, com prazo de trancar a pauta', () => {
    expect(vetos.length).toBeGreaterThan(10)
    const e = eventoDoVeto(vetos[0])!
    expect(e.alvo.identificacoes).toEqual(['PL 2951/2024'])
    expect(e.alvo.chaves).toEqual(['senado:materia:164777', 'norma:lei:15526:2026'])
    expect(e.chavesExtras).toEqual(['senado:materia:175890'])
    expect(e.tramitacoes[0]).toMatchObject({ chave: 'congresso:veto:18769', tipoEvento: 'veto', orgao: 'CN' })
    expect(e.tramitacoes[0].descricao).toBe('Veto parcial nº 55/2026 (3 dispositivos). Marco Legal do Seguro Rural. Passa a trancar a pauta do Congresso em 30/10/2026')
  })

  it('resultado: veto total derrubado pelo Congresso', () => {
    const r = vetoDoResultado(amostra('senado/veto-resultado-materia'))!
    const e = eventoDoVeto(r, r)!
    expect(e.alvo.identificacoes).toEqual(['PL 2162/2023'])
    expect(e.tramitacoes[1]).toMatchObject({ chave: 'congresso:veto:17969:resultado', tipoEvento: 'votacao', descricao: 'Congresso derrubou o veto total' })
  })

  it('agenda do Congresso: só sessões do Congresso, com chave própria', () => {
    const cn = mapearAgendaPlenarioSenado(amostra('senado/agenda-congresso'), 'CN')
    expect(cn.every((p) => p.chave.startsWith('congresso:pauta:'))).toBe(true)
    expect(mapearAgendaPlenarioSenado(amostra('senado/agenda-congresso'), 'SF')).toEqual([])
  })
})

describe('Diário Oficial (modelo do INLABS)', () => {
  const lei = lerAto(modelo('515_20250808_lei.xml'))!
  const veto = lerAto(modelo('515_20250808_veto.xml'))!
  const portaria = lerAto(modelo('515_20250808_portaria.xml'))!
  const outro = lerAto(modelo('515_20250808_outro.xml'))!

  it('lê o ato: identificação, data, página e texto sem HTML', () => {
    expect(lei).toMatchObject({ id: '9000001', tipo: 'Lei', identifica: 'LEI Nº 15.190, DE 8 DE AGOSTO DE 2025', data: '2025-08-08T15:00:00.000Z', pagina: '1' })
    expect(lei.url).toBe('http://pesquisa.in.gov.br/imprensa/jsp/visualiza/index.jsp?data=08/08/2025&jornal=515&pagina=1')
    expect(lei.texto).toMatch(/^LEI Nº 15\.190.*\nDispõe sobre o licenciamento ambiental\.\nO PRESIDENTE DA REPÚBLICA/)
    expect(veto.texto).toContain('"Dispõe sobre o licenciamento ambiental"')
  })

  it('sigla, número e órgão', () => {
    expect([siglaDoAto(lei), numeroEAno(lei)]).toEqual(['LEI', { numero: 15190, ano: 2025 }])
    expect([siglaDoAto(portaria), orgaoDoAto(portaria), numeroEAno(portaria)]).toEqual(['PRT-IBAMA', 'IBAMA', { numero: 45, ano: 2025 }])
    expect(siglaDoAto(outro)).toBeNull()
    expect(vetoDaMensagem(veto)).toEqual({ total: false, identificacao: 'PL 2159/2021' })
  })

  const ctx = (acompanhadas: string[]) => ({
    acompanhadas: new Set(acompanhadas),
    descartadas: new Set<string>(),
    relevancia: (t: string) => (/licenciamento ambiental/i.test(t) ? 80 : 0),
    notaMinima: 40,
  })

  it('lei de proposta acompanhada: andamento e texto da lei, sem virar proposta nova', () => {
    const r = classificarAto(lei, ctx(['norma:lei:15190:2025']))
    expect(r.pacote).toBeUndefined()
    expect(r.evento!.alvo.chaves).toContain('norma:lei:15190:2025')
    expect(r.evento!.tramitacoes[0]).toMatchObject({ tipoEvento: 'sancao' })
    expect(r.evento!.versoes![0]).toMatchObject({ tipo: 'norma', chave: 'dou:9000001' })
  })

  it('mensagem de veto só interessa se a proposta é acompanhada', () => {
    expect(classificarAto(veto, ctx([])).evento).toBeUndefined()
    const r = classificarAto(veto, ctx(['PL 2159/2021']))
    expect(r.evento!.tramitacoes[0]).toMatchObject({ tipoEvento: 'veto', orgao: 'PR' })
    expect(r.evento!.tramitacoes[0].descricao).toMatch(/^Veto parcial publicado no Diário Oficial \(Mensagem nº 1097\/2025\)/)
  })

  it('ato novo relevante entra na triagem; irrelevante não', () => {
    const r = classificarAto(portaria, ctx([]))
    expect(r.pacote!.proposicao).toMatchObject({ chave: 'dou:9000003', sigla: 'PRT-IBAMA', numero: 45, ano: 2025, casa: 'presidencia', statusSimplificado: 'norma' })
    expect(r.pacote!.versoes[0].texto).toMatch(/Art\. 1º Estabelecer procedimentos/)
    expect(classificarAto(outro, ctx([])).pacote).toBeUndefined()
  })

  it('todos os modelos são lidos', () => {
    const dir = path.resolve(__dirname, '../fixtures/coleta/dou-modelo')
    expect(readdirSync(dir).filter((n) => n.endsWith('.xml')).map((n) => lerAto(modelo(n))).every(Boolean)).toBe(true)
  })
})
