import { describe, expect, it } from 'vitest'
import { alteracoesDoTexto, artigoDaLei, porLei } from '@/lib/alteracoes'

const PROPOSTA = `Altera a Lei nº 12.651, de 25 de maio de 2012, para dispor sobre áreas de preservação permanente.
O CONGRESSO NACIONAL decreta:
Art. 1º Esta Lei altera a Lei nº 12.651, de 25 de maio de 2012.
Art. 2º O art. 4º da Lei nº 12.651, de 25 de maio de 2012, passa a vigorar com a seguinte redação:
“Art. 4º ...............................................
§ 10. Em áreas urbanas consolidadas, lei municipal poderá definir faixas
marginais distintas das estabelecidas no inciso I do caput.” (NR)
Art. 3º A Lei nº 12.651, de 25 de maio de 2012, passa a vigorar acrescida do seguinte art. 4º-A:
“Art. 4º-A. O plano de recuperação será aprovado pelo órgão ambiental competente.” (AC)
Art. 4º Ficam revogados o art. 61-B e o § 2º do art. 7º da Lei nº 12.651, de 25 de maio de 2012.
Art. 5º Esta Lei entra em vigor na data de sua publicação.`

const CODIGO = `Art. 3º Para os efeitos desta Lei, entende-se por:
I - Amazônia Legal: os Estados do Acre, Pará, Amazonas;
Art. 4º Considera-se Área de Preservação Permanente, em zonas rurais ou urbanas, para os efeitos desta Lei:
I - as faixas marginais de qualquer curso d’água natural perene e intermitente;
§ 9º (VETADO).
Art. 4º-A (Revogado)
Art. 5º Na implantação de reservatório d’água artificial é obrigatória a aquisição.
Art. 7º A vegetação situada em Área de Preservação Permanente deverá ser mantida.
§ 2º A obrigação prevista no § 1º tem natureza real.
Art. 40. O Governo Federal deverá estabelecer uma Política Nacional de Manejo.
Art. 41. É o Poder Executivo federal autorizado a instituir programa de apoio.`

describe('alterações em lei existente', () => {
  const alt = alteracoesDoTexto(PROPOSTA)

  it('acha nova redação, acréscimo e revogação, com a lei alterada', () => {
    expect(alt.map((a) => [a.tipo, a.dispositivo, a.artigo])).toEqual([
      ['nova_redacao', 'Art. 4º', '4'],
      ['acrescimo', 'Art. 4º-A', '4-A'],
      ['revogacao', 'Art. 61-B', '61-B'],
      ['revogacao', '§ 2º do art. 7º', '7'],
    ])
    expect(new Set(alt.map((a) => a.lei.rotulo))).toEqual(new Set(['Lei nº 12.651/2012']))
    expect(alt[0].lei.urn).toBe('urn:lex:br:federal:lei:2012-05-25;12651')
  })

  it('a redação proposta é literal, sem aspas nem (NR)', () => {
    expect(alt[0].proposto).toBe('Art. 4º ............................................... § 10. Em áreas urbanas consolidadas, lei municipal poderá definir faixas marginais distintas das estabelecidas no inciso I do caput.')
    expect(alt[1].proposto).toBe('Art. 4º-A. O plano de recuperação será aprovado pelo órgão ambiental competente.')
  })

  it('agrupa por lei', () => {
    const g = porLei(alt)
    expect(g).toHaveLength(1)
    expect(g[0].itens).toHaveLength(4)
  })

  it('várias leis e aspas retas', () => {
    const t = `Art. 1º O art. 2º da Lei nº 9.985, de 18 de julho de 2000, passa a vigorar com a seguinte redação: "Art. 2º Texto novo do SNUC." (NR)
Art. 2º O art. 29 da Lei nº 9.605, de 12 de fevereiro de 1998, passa a vigorar com a seguinte redação: "Art. 29. Matar espécimes da fauna silvestre: pena de reclusão." (NR)
Art. 3º Esta Lei entra em vigor na data de sua publicação.`
    const a = alteracoesDoTexto(t)
    expect(a.map((x) => [x.lei.rotulo, x.artigo, x.proposto])).toEqual([
      ['Lei nº 9.985/2000', '2', 'Art. 2º Texto novo do SNUC.'],
      ['Lei nº 9.605/1998', '29', 'Art. 29. Matar espécimes da fauna silvestre: pena de reclusão.'],
    ])
  })

  it('remissão com "art." minúsculo dentro do texto citado não abre outro artigo', () => {
    const a = alteracoesDoTexto('Art. 3º A Lei nº 6.938, de 31 de agosto de 1981, passa a vigorar acrescida do seguinte art. 10-A: “Art. 10-A. A dispensa de que trata o § 5º do art. 10 será declarada pelo empreendedor. Parágrafo único. O órgão poderá exigir estudo.” (AC) Art. 4º Esta Lei entra em vigor.')
    expect(a).toHaveLength(1)
    expect(a[0].proposto).toBe('Art. 10-A. A dispensa de que trata o § 5º do art. 10 será declarada pelo empreendedor. Parágrafo único. O órgão poderá exigir estudo.')
  })

  it('proposta que não altera lei não gera nada', () => {
    expect(alteracoesDoTexto('Art. 1º Fica criada a Reserva Extrativista. Art. 2º Esta Lei entra em vigor na data de sua publicação.')).toEqual([])
    expect(alteracoesDoTexto(null)).toEqual([])
  })
})

describe('redação vigente no texto compilado', () => {
  it('recorta o artigo inteiro, com parágrafos e incisos, até o próximo artigo', () => {
    expect(artigoDaLei(CODIGO, '4')).toBe('Art. 4º Considera-se Área de Preservação Permanente, em zonas rurais ou urbanas, para os efeitos desta Lei:\nI - as faixas marginais de qualquer curso d’água natural perene e intermitente;\n§ 9º (VETADO).')
    expect(artigoDaLei(CODIGO, '4-A')).toBe('Art. 4º-A (Revogado)')
    expect(artigoDaLei(CODIGO, '7')).toContain('§ 2º A obrigação prevista no § 1º tem natureza real.')
  })
  it('não confunde o art. 4 com o 40 ou o 41', () => {
    expect(artigoDaLei(CODIGO, '40')).toBe('Art. 40. O Governo Federal deverá estabelecer uma Política Nacional de Manejo.')
    expect(artigoDaLei(CODIGO, '4')).not.toContain('Art. 40')
  })
  it('artigo que não existe (acréscimo) ou lei sem texto volta vazio', () => {
    expect(artigoDaLei(CODIGO, '99')).toBe('')
    expect(artigoDaLei(null, '4')).toBe('')
  })
})

describe('chave da lei alterada', () => {
  it('federal e estadual', async () => {
    const { chaveNorma } = await import('@/lib/alteracoes')
    expect(chaveNorma({ tipo: 'Lei', numero: '12651', ano: '2012' })).toBe('lei-12651-2012')
    expect(chaveNorma({ tipo: 'Lei Complementar', numero: '140', ano: '2011' })).toBe('lei-complementar-140-2011')
    expect(chaveNorma({ tipo: 'Lei', numero: '5887', ano: '1995' }, 'PA')).toBe('pa-lei-5887-1995')
  })
})
