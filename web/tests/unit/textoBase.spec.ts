import { describe, expect, it } from 'vitest'
import { organizarTexto, rotuloDoTrecho } from '@/lib/textoBase'

describe('texto base da proposta', () => {
  it('junta as linhas quebradas pelo PDF e marca cada dispositivo', () => {
    const t = organizarTexto(
      [
        'CAPÍTULO I',
        'DAS DISPOSIÇÕES GERAIS',
        'Art. 1º Fica criada a Reserva Extrativista do Baixo Rio Exemplo, no',
        'município de Exemplo, com área de 48 mil hectares.',
        'Parágrafo único. A área consta do memorial descritivo anexo.',
        'Art. 2º São objetivos da Reserva:',
        'I – proteger os meios de vida das comunidades extra-',
        'tivistas;',
        'II – assegurar o uso sustentável dos recursos naturais.',
        '§ 1º O plano de manejo será aprovado pelo conselho deliberativo.',
        'a) com participação das comunidades;',
      ].join('\n'),
    )
    expect(t.dispositivos.map((d) => d.tipo)).toEqual(['divisao', 'artigo', 'paragrafo', 'artigo', 'inciso', 'inciso', 'paragrafo', 'alinea'])
    expect(t.dispositivos[0].texto).toBe('CAPÍTULO I · DAS DISPOSIÇÕES GERAIS')
    expect(t.dispositivos[1].texto).toBe('Art. 1º Fica criada a Reserva Extrativista do Baixo Rio Exemplo, no município de Exemplo, com área de 48 mil hectares.')
    expect(t.dispositivos[4].texto).toBe('I – proteger os meios de vida das comunidades extrativistas;')
    expect(t.justificacao).toEqual([])
  })

  it('separa a justificação do autor', () => {
    const t = organizarTexto('Art. 1º Esta Lei entra em vigor na data de sua publicação.\nJUSTIFICAÇÃO\nA área sofre pressão crescente\nde extração ilegal.\nPor isso, pedimos o apoio dos pares.')
    expect(t.dispositivos).toHaveLength(1)
    expect(t.justificacao).toEqual(['A área sofre pressão crescente de extração ilegal.', 'Por isso, pedimos o apoio dos pares.'])
  })

  it('separa texto corrido em artigos e parágrafos', () => {
    const t = organizarTexto('Art. 3º Ficam dispensadas as atividades de até 30 módulos. § 2º A dispensa não se aplica a zonas de amortecimento. Art. 7º O órgão poderá exigir estudo complementar.')
    expect(t.dispositivos.map((d) => d.tipo)).toEqual(['artigo', 'paragrafo', 'artigo'])
    // Remissão no meio da frase não abre dispositivo
    expect(organizarTexto('Art. 4º Aplica-se o previsto no § 1º do Art. 2º desta Lei.').dispositivos).toHaveLength(1)
  })

  it('texto vazio não quebra', () => {
    expect(organizarTexto(null)).toEqual({ dispositivos: [], justificacao: [] })
  })

  it('destaca o rótulo do dispositivo', () => {
    expect(rotuloDoTrecho({ tipo: 'artigo', texto: 'Art. 12. Revoga-se a Lei nº 1.000.' })).toEqual({ rotulo: 'Art. 12.', resto: 'Revoga-se a Lei nº 1.000.' })
    expect(rotuloDoTrecho({ tipo: 'paragrafo', texto: 'Parágrafo único. A área consta do anexo.' }).rotulo).toBe('Parágrafo único.')
    expect(rotuloDoTrecho({ tipo: 'inciso', texto: 'IV – fiscalizar.' })).toEqual({ rotulo: 'IV –', resto: 'fiscalizar.' })
    expect(rotuloDoTrecho({ tipo: 'texto', texto: 'Qualquer coisa' }).rotulo).toBe('')
  })
})
