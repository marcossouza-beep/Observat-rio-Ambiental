// Gera os modelos em Word da nota técnica e do quadro comparativo (ênfase jur).
const fs = require('fs')
const path = require('path')
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle,
  AlignmentType, HeadingLevel, Header, Footer, PageNumber, ImageRun, LevelFormat, PageOrientation, TabStopType, PageBreak,
} = require('docx')

const SAIDA = process.argv[2]
const LOGO = fs.readFileSync(process.argv[3])
const GRAF = process.argv[4] // pasta com os gráficos de exemplo (PNG)
const grafico = (nome, largura, altura) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 40 }, children: [new ImageRun({ type: 'png', data: fs.readFileSync(path.join(GRAF, nome)), transformation: { width: largura, height: altura } })] })
const legendaFig = (texto) => p([t(texto, { size: 16, color: DICA })], { alignment: AlignmentType.CENTER, spacing: { after: 120 } })
const VERDE = '23864F'
const CINZA = '4B4B4B'
const DICA = '7A847E'
const LINHA = 'D5DDD8'
const FUNDO = 'EEF6F1'
const FONTE = 'Arial'

const t = (texto, o = {}) => new TextRun({ text: texto, font: FONTE, ...o })
const p = (filhos, o = {}) => new Paragraph({ children: Array.isArray(filhos) ? filhos : [filhos], spacing: { after: 80, line: 276 }, ...o })
const dica = (texto) => p([t(texto, { italics: true, color: DICA, size: 18 })], { spacing: { after: 60 } })
const vaga = (texto = '[Escreva aqui]') => p([t(texto, { color: CINZA, size: 21 })])
const h1 = (texto) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [t(texto, { bold: true, size: 24, color: VERDE })], spacing: { before: 220, after: 80 }, border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: LINHA, space: 2 } } })
const h2 = (texto) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [t(texto, { bold: true, size: 21, color: CINZA })], spacing: { before: 120, after: 40 } })
const item = (texto, ref = 'pontos') => new Paragraph({ numbering: { reference: ref, level: 0 }, children: [t(texto, { size: 21, color: CINZA })], spacing: { after: 40 } })

const literal = (texto) => p([t(texto, { font: 'Times New Roman', size: 21, color: DICA, italics: true })], { indent: { left: 360 }, border: { left: { style: BorderStyle.SINGLE, size: 8, color: LINHA, space: 8 } } })

const borda = { style: BorderStyle.SINGLE, size: 4, color: LINHA }
const bordas = { top: borda, bottom: borda, left: borda, right: borda }
function tabela(larguras, linhas, { cabecalho = true } = {}) {
  const total = larguras.reduce((a, b) => a + b, 0)
  return new Table({
    width: { size: total, type: WidthType.DXA },
    columnWidths: larguras,
    rows: linhas.map((cols, i) => new TableRow({
      tableHeader: cabecalho && i === 0,
      children: cols.map((c, j) => new TableCell({
        width: { size: larguras[j], type: WidthType.DXA },
        borders: bordas,
        margins: { top: 60, bottom: 60, left: 100, right: 100 },
        shading: cabecalho && i === 0 ? { type: ShadingType.CLEAR, color: 'auto', fill: FUNDO } : undefined,
        children: [new Paragraph({ children: [t(c, cabecalho && i === 0 ? { bold: true, size: 18, color: VERDE } : { size: 18, color: c.startsWith('[') ? DICA : CINZA, italics: c.startsWith('[') })] })],
      })),
    })),
  })
}
// Ficha técnica: rótulo à esquerda, valor à direita
function ficha(larguraTotal, pares) {
  const l1 = Math.round(larguraTotal * 0.3)
  return new Table({
    width: { size: larguraTotal, type: WidthType.DXA },
    columnWidths: [l1, larguraTotal - l1],
    rows: pares.map(([r, v]) => new TableRow({ children: [
      new TableCell({ width: { size: l1, type: WidthType.DXA }, borders: bordas, shading: { type: ShadingType.CLEAR, color: 'auto', fill: FUNDO }, margins: { top: 50, bottom: 50, left: 100, right: 100 }, children: [p(t(r, { bold: true, size: 18, color: VERDE }), { spacing: { after: 0 } })] }),
      new TableCell({ width: { size: larguraTotal - l1, type: WidthType.DXA }, borders: bordas, margins: { top: 50, bottom: 50, left: 100, right: 100 }, children: [p(t(v, { size: 18, color: v.startsWith('[') ? DICA : CINZA, italics: v.startsWith('[') }), { spacing: { after: 0 } })] }),
    ] })),
  })
}
const cabecalho = (rotulo, largura = 9026) => new Header({ children: [new Paragraph({
  tabStops: [{ type: TabStopType.RIGHT, position: largura }],
  border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: LINHA, space: 4 } },
  children: [new ImageRun({ type: 'png', data: LOGO, transformation: { width: 118, height: 36 } }), t('\t' + rotulo, { size: 16, color: DICA })],
})] })
const rodape = (rotulo) => new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [
  t(`${rotulo} · página `, { size: 16, color: DICA }), new TextRun({ children: [PageNumber.CURRENT], font: FONTE, size: 16, color: DICA }),
  t(' de ', { size: 16, color: DICA }), new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONTE, size: 16, color: DICA }),
] })] })
const numeracao = { config: [
  { reference: 'pontos', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 400, hanging: 240 } } } }] },
  { reference: 'recs', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 400, hanging: 280 } } } }] },
] }
const estilos = { default: { document: { run: { font: FONTE, size: 21, color: CINZA } } } }

// ---------------- NOTA TÉCNICA (A4 retrato) ----------------
const W = 9026 // largura útil A4 com margens de 1.440
const nota = new Document({
  creator: 'ênfase jur', title: 'Nota técnica (modelo)', styles: estilos, numbering: numeracao,
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1300, bottom: 1700, left: 1440, right: 1440, footer: 1150 } } },
    headers: { default: cabecalho('Nota técnica') },
    footers: { default: rodape('Nota técnica') },
    children: [
      p([t('NOTA TÉCNICA Nº [__]/[ANO]', { bold: true, size: 30, color: CINZA })], { spacing: { after: 40 } }),
      p([t('Parecer prévio sobre [sigla, número e ano da proposta]', { size: 24, color: DICA, italics: true })], { spacing: { after: 120 } }),
      dica('Modelo padrão. Alvo: 3 páginas de análise (partes 2 a 12, cerca de 1.500 palavras); a ficha, o texto base (parte 1) e o Anexo I são transcrição e não contam. Apague as orientações em cinza e itálico ao preencher. A ordem das partes é sempre a mesma, para que as notas possam ser comparadas entre si.'),
      dica('Este documento circula sozinho e pode ser lido meses depois: por isso abre com a identificação e o texto base. O pé de cada página fica livre: ao baixar, o sistema carimba ali a identificação do parecer, o link permanente e o QR que levam à versão atual no observatório.'),

      h1('0. Ficha técnica'),
      ficha(W, [
        ['Proposta', '[Sigla, número e ano · casa · UF ou federal]'],
        ['Etapa', '[Onde está na tramitação, na data do parecer]'],
        ['Texto analisado', '[Versão e data do texto analisado, com o endereço oficial]'],
        ['Norma vigente afetada', '[Lei e artigos que a proposta altera]'],
        ['Impacto · caráter', '[Alto, médio ou baixo] · [Maléfico, enfraquece indiretamente, neutro ou benéfico]'],
        ['Temas · biomas', '[Temas e biomas]'],
        ['Parecer', '[Versão do parecer] · publicado em [data] · autor: [nome, título]'],
        ['Link permanente', '[Copie do painel, quadro "Links dos PDFs". O sistema também o carimba em cada página.]'],
        ['Quadro comparativo', '[Sim/não] · documento à parte, com a transcrição artigo por artigo'],
      ]),

      h1('1. Texto base da proposta'),
      dica('A matéria bruta, antes de qualquer análise. Transcrição literal do arquivo oficial, sem edição nem destaque. O painel traz o texto pronto para copiar (dossiê).'),
      h2('1.1 Ementa'),
      literal('[Ementa oficial, como está na fonte]'),
      h2('1.2 Dispositivos centrais'),
      dica('Os artigos que concentram a mudança, na redação do texto analisado. A íntegra, com a justificação do autor, vai no Anexo I.'),
      literal('[Art. __. Redação literal.]'),
      literal('[§ __. Redação literal.]'),
      h2('1.3 Texto normativo alterado: como é hoje × como fica'),
      dica('Só quando a proposta altera lei existente. Redação vigente (texto compilado da lei) ao lado da redação proposta, as duas literais. O site monta este quadro sozinho (normas.leg.br); copie de lá. Análise nenhuma aqui: ela vem na parte 4.'),
      tabela([1700, 3663, 3663], [
        ['Dispositivo', 'Como é hoje (redação vigente)', 'Como fica (redação proposta)'],
        ['[Lei X, art. __]', '[Redação vigente, literal]', '[Redação proposta, literal]'],
        ['[Lei X, art. __-A]', '[Dispositivo novo: não há redação vigente]', '[Redação proposta, literal]'],
      ]),

      h1('2. Síntese'),
      dica('Até 120 palavras. Escreva por último. Em 4 a 5 frases: o que a norma faz, o problema, a hipótese testada e a conclusão.'),
      vaga(),

      h1('3. Descrição do ato normativo'),
      dica('Cerca de meia página. Só fatos, com fonte: ainda não é a análise.'),
      h2('3.1 Objeto e alcance'),
      dica('O que regula, quem é atingido, onde e a partir de quando.'),
      vaga(),
      h2('3.2 Como funciona hoje (linha de base)'),
      dica('As regras vigentes e os números atuais. É o ponto de comparação de toda a nota.'),
      vaga(),

      h1('4. Análise do quadro comparativo'),
      dica('A leitura do cotejo fica aqui. O quadro comparativo (documento à parte) traz a transcrição artigo por artigo (parte A), a testagem das hipóteses (parte B) e a comparação de potencialidades com gráficos (parte C).'),
      h2('4.1 Pontos principais'),
      dica('De 3 a 5 pontos, os mesmos do site. Cada lado como enunciado objetivo, sem adjetivos.'),
      tabela([1700, 3000, 3000, 1326], [
        ['Ponto', 'Regime vigente', 'Proposta', 'Efeito'],
        ['[1 · Art. __]', '[Como é hoje]', '[Como fica]', '[↑ ↓ =]'],
        ['[2 · Art. __]', '[Como é hoje]', '[Como fica]', '[↑ ↓ =]'],
        ['[3 · Art. __]', '[Como é hoje]', '[Como fica]', '[↑ ↓ =]'],
      ]),
      p([t('Efeito na proteção ambiental: ', { bold: true, size: 18 }), t('↑ amplia · ↓ reduz · = sem efeito direto.', { size: 18 })], { spacing: { before: 80 } }),
      h2('4.2 Leitura do cotejo'),
      dica('O que o conjunto das mudanças produz: o sentido geral, as mudanças que dependem umas das outras e o que o texto não diz (omissões, conceitos indeterminados, delegação a regulamento).'),
      vaga(),

      h1('5. Exposição do problema'),
      dica('Cerca de meia página.'),
      h2('5.1 Problema declarado'),
      dica('O que a justificativa da proposta diz enfrentar, nas palavras do autor da proposta.'),
      vaga(),
      h2('5.2 Problema identificado'),
      dica('O que a análise mostra: causa → efeito → quem sofre o efeito. Pode coincidir ou não com o problema declarado.'),
      vaga(),
      h2('5.3 Evidências'),
      dica('Cada dado com fonte, ano e grau de confiança (alta, média ou baixa).'),
      tabela([4200, 3026, 1800], [['Dado', 'Fonte e ano', 'Confiança'], ['[Dado]', '[Fonte, ano]', '[Alta/média/baixa]'], ['[Dado]', '[Fonte, ano]', '[Alta/média/baixa]']]),

      h1('6. Hipóteses'),
      dica('De 1 a 3 hipóteses. Cada uma é uma frase que um indicador pode confirmar ou derrubar, com o limiar escrito antes de olhar o resultado. A testagem fica no quadro comparativo, parte B (e na planilha).'),
      dica('Formato: "Se aprovada, a proposta tende a produzir [efeito], porque [mecanismo]."'),
      tabela([700, 3600, 2100, 1300, 1326], [
        ['Nº', 'Hipótese', 'Indicador e fonte', 'Sentido', 'Limiar'],
        ['H1', '[Se aprovada, a proposta tende a ... porque ...]', '[O que medir · onde]', '[Aumento/redução]', '[Ex.: +10% em 3 anos]'],
        ['H2', '[Hipótese]', '[Indicador · fonte]', '[Aumento/redução]', '[Limiar]'],
      ]),

      h1('7. Impactos potenciais'),
      dica('Cerca de meia página. Direção de −2 (muito negativo) a +2 (muito positivo).'),
      h2('7.1 Por dimensão'),
      tabela([1700, 1000, 1300, 1300, 1300, 2426], [
        ['Dimensão', 'Direção', 'Magnitude', 'Prazo', 'Reversível?', 'Quem é afetado'],
        ['Ambiental', '[−2 a +2]', '[Alta/média/baixa]', '[Curto/longo]', '[Sim/não]', '[Grupos, áreas]'],
        ['Social', '[−2 a +2]', '[Alta/média/baixa]', '[Curto/longo]', '[Sim/não]', '[Grupos, áreas]'],
        ['Econômica', '[−2 a +2]', '[Alta/média/baixa]', '[Curto/longo]', '[Sim/não]', '[Setores]'],
        ['Institucional e fiscal', '[−2 a +2]', '[Alta/média/baixa]', '[Curto/longo]', '[Sim/não]', '[Órgãos, orçamento]'],
      ]),
      h2('7.2 Compatibilidade jurídica'),
      dica('Constituição (art. 225), competências (LC 140/2011), conflito com normas vigentes e risco de questionamento judicial.'),
      vaga(),

      h1('8. Análise de cenários'),
      dica('Cada cenário com as premissas escritas e o resultado esperado no indicador da H1, no mesmo horizonte (padrão: 5 anos). Os gráficos da comparação ficam no quadro comparativo, parte C.'),
      tabela([2300, 3363, 3363], [
        ['Cenário', 'Premissas', 'Resultado esperado no indicador'],
        ['A. Referência (a proposta não é aprovada)', '[Premissas]', '[Resultado]'],
        ['B. Aprovada como está', '[Premissas]', '[Resultado]'],
        ['C. Aprovada com os ajustes recomendados', '[Premissas]', '[Resultado]'],
      ]),

      h1('9. Soluções potenciais'),
      dica('De 2 a 4 opções: manter, ajustar, rejeitar ou alternativa sem lei nova (fiscalização, regulamento).'),
      tabela([2600, 2142, 2142, 2142], [
        ['Opção', 'Eficácia', 'Custo', 'Viabilidade jurídica'],
        ['[Opção 1]', '[Alta/média/baixa]', '[Alto/médio/baixo]', '[Alta/média/baixa]'],
        ['[Opção 2]', '[Alta/média/baixa]', '[Alto/médio/baixo]', '[Alta/média/baixa]'],
      ]),

      h1('10. Casos de referência'),
      dica('2 a 3 casos: outro estado, outro país, decisão judicial ou experiência anterior.'),
      tabela([2000, 2500, 2500, 2026], [
        ['Caso', 'O que foi feito', 'O que aconteceu', 'Comparabilidade'],
        ['[Caso 1]', '[Medida]', '[Resultado observado]', '[Alta/média/baixa e por quê]'],
        ['[Caso 2]', '[Medida]', '[Resultado observado]', '[Alta/média/baixa e por quê]'],
      ]),

      h1('11. Conclusão e recomendações'),
      dica('Cerca de 1/4 de página. Responda a cada hipótese com o resultado da testagem (quadro comparativo, parte B): sustentada, sustentada em parte, não sustentada ou inconclusiva. Depois, justifique o impacto e o caráter em uma linha cada.'),
      tabela([700, 2600, 5726], [['Nº', 'Resultado', 'Por quê (1 linha)'], ['H1', '[Sustentada / em parte / não sustentada / inconclusiva]', '[Evidência decisiva e confiança]'], ['H2', '[Resultado]', '[Por quê]']]),
      vaga('[Conclusão]'),
      dica('Recomendações numeradas, cada uma com o destinatário (relator, Executivo, órgão ambiental):'),
      new Paragraph({ numbering: { reference: 'recs', level: 0 }, children: [t('[Recomendação] — destinatário: [quem]', { size: 21, color: CINZA })], spacing: { after: 40 } }),
      new Paragraph({ numbering: { reference: 'recs', level: 0 }, children: [t('[Recomendação] — destinatário: [quem]', { size: 21, color: CINZA })], spacing: { after: 40 } }),
      dica('O que monitorar daqui em diante: [indicadores e marcos da tramitação].'),

      h1('12. Referências e limitações'),
      dica('Normas, dados e estudos citados. Em seguida, o que não foi possível verificar e por quê.'),
      item('[Referência]'),
      item('[Limitação da análise]'),
      p([t('Esta nota técnica foi escrita e é assinada pelo autor indicado, que responde pelo conteúdo. Expressa análise técnica independente e não substitui orientação jurídica para casos concretos.', { size: 16, color: DICA })], { spacing: { before: 200 } }),

      new Paragraph({ children: [new PageBreak()] }),
      h1('Anexo I. Íntegra do texto base'),
      dica('Transcrição literal do arquivo oficial da versão analisada, com a justificação do autor. Não conta nas 3 páginas. Indique a fonte e a data de acesso.'),
      p([t('Fonte: ', { bold: true, size: 18 }), t('[endereço oficial] · [versão e data] · acesso em [data]', { size: 18, color: DICA, italics: true })]),
      literal('[Íntegra do texto]'),
    ],
  }],
})

// ---------------- QUADRO COMPARATIVO (A4 paisagem) ----------------
const WP = 14400 // largura útil A4 paisagem com margens de ~1.200
const quadro = new Document({
  creator: 'ênfase jur', title: 'Quadro comparativo (modelo)', styles: estilos, numbering: numeracao,
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838, orientation: PageOrientation.LANDSCAPE }, margin: { top: 1100, bottom: 1650, left: 1219, right: 1219, footer: 1150 } } },
    headers: { default: cabecalho('Quadro comparativo', WP) },
    footers: { default: rodape('Quadro comparativo') },
    children: [
      p([t('QUADRO COMPARATIVO', { bold: true, size: 30, color: CINZA })], { spacing: { after: 40 } }),
      p([t('[Proposta]: cotejo dos textos, testagem das hipóteses e comparação de potencialidades', { size: 24, color: DICA, italics: true })], { spacing: { after: 120 } }),
      dica('Três partes, sempre nesta ordem: A. cotejo literal dos textos (sem comentário); B. testagem das hipóteses da nota técnica (parte 6); C. comparação de potencialidades entre os cenários, com gráficos. Os números vêm da planilha de hipóteses e gráficos. O pé de cada página fica livre para o carimbo do sistema (identificação, link permanente e QR). Apague as orientações em cinza ao preencher.'),
      ficha(WP, [
        ['Proposta', '[Sigla, número e ano · casa · UF ou federal] · [ementa]'],
        ['Texto proposto', '[Versão analisada e data]'],
        ['Texto vigente', '[Lei alterada, data e versão consolidada consultada]'],
        ['Parecer de referência', 'Nota técnica nº [__]/[ANO] · versão [__] · [autor]'],
        ['Link permanente', '[Copie do painel, quadro "Links dos PDFs". O sistema também o carimba em cada página.]'],
      ]),

      h1('A. Cotejo dos textos'),
      dica('Só transcrição: as colunas reproduzem as fontes oficiais, sem comentário. A leitura do cotejo está na nota técnica (parte 4) e no site.'),
      tabela([1800, 6300, 6300], [
        ['Dispositivo', 'Texto vigente', 'Texto proposto'],
        ['[Lei X, art. 3º]', '[Redação atual, como na fonte oficial]', '[Redação proposta, como no texto analisado]'],
        ['[Lei X, art. 4º, § 2º]', '[Redação atual]', '[Redação proposta]'],
        ['[Dispositivo]', '[Redação atual]', '[Redação proposta]'],
      ]),
      h2('Dispositivos novos (sem correspondente na lei atual)'),
      tabela([1800, 12600], [['Dispositivo', 'Texto proposto'], ['[Art. novo]', '[Redação]']]),
      h2('Dispositivos revogados'),
      tabela([1800, 12600], [['Dispositivo', 'Texto que deixa de valer'], ['[Art. revogado]', '[Redação atual]']]),

      new Paragraph({ children: [new PageBreak()] }),
      h1('B. Testagem das hipóteses'),
      dica('Uma linha por hipótese da nota técnica (parte 6), com o limiar fixado antes de ver o resultado. A planilha sugere o resultado pelo critério; o resultado que vale é o do autor.'),
      tabela([700, 3300, 2300, 1500, 1300, 1500, 1200, 2600], [
        ['Nº', 'Hipótese', 'Indicador · fonte', 'Linha de base', 'Limiar', 'Observado ou projetado', 'Confiança', 'Resultado e por quê'],
        ['H1', '[Como na nota técnica]', '[Indicador · fonte, ano]', '[Valor, ano]', '[Ex.: +10%]', '[Ex.: +18%]', '[Alta/média/baixa]', '[Sustentada / em parte / não sustentada / inconclusiva] · [1 linha]'],
        ['H2', '[Hipótese]', '[Indicador · fonte]', '[Valor]', '[Limiar]', '[Valor]', '[Confiança]', '[Resultado] · [1 linha]'],
      ]),
      p([t('Critérios: ', { bold: true, size: 18 }), t('sustentada, atinge o limiar no sentido esperado com evidência de confiança alta ou média; sustentada em parte, atinge ao menos metade do limiar, ou o limiar só com confiança baixa; não sustentada, fica abaixo da metade do limiar ou vai no sentido contrário; inconclusiva, falta dado ou caso comparável (diga o que faltou).', { size: 18 })], { spacing: { before: 120 } }),
      p([t('Confiança: ', { bold: true, size: 18 }), t('alta, dado oficial com série histórica ou estudo revisado por pares aplicável ao caso; média, dado oficial parcial ou caso comparável de outra jurisdição; baixa, estimativa, caso único ou dado sem método publicado.', { size: 18 })]),

      new Paragraph({ children: [new PageBreak()] }),
      h1('C. Comparação de potencialidades'),
      dica('Os três cenários da nota técnica (parte 8), no mesmo indicador e no mesmo horizonte. Cores fixas: A azul, B laranja, C verde-água. Abaixo de cada gráfico, a fonte e o ano dos dados. Os gráficos abaixo são exemplos com dados fictícios: substitua pelos da planilha.'),
      h2('Gráfico 1. Trajetória do indicador da H1 por cenário, com o limiar da hipótese'),
      grafico('grafico-trajetoria.png', 860, 340),
      legendaFig('Exemplo ilustrativo, dados fictícios. Fonte: [fonte dos dados, ano] · Premissas: [cenários A, B e C].'),
      tabela([2400, 2000, 2000, 2000, 2000, 2000, 2000], [
        ['Cenário', '2025', '2026', '2027', '2028', '2029', '2030'],
        ['A. Referência', '[valor]', '[valor]', '[valor]', '[valor]', '[valor]', '[valor]'],
        ['B. Aprovada como está', '[valor]', '[valor]', '[valor]', '[valor]', '[valor]', '[valor]'],
        ['C. Aprovada com ajustes', '[valor]', '[valor]', '[valor]', '[valor]', '[valor]', '[valor]'],
      ]),
      new Paragraph({ children: [new PageBreak()] }),
      h2('Gráfico 2. Potencialidades por dimensão: B e C em relação ao cenário A'),
      dica('Escala de −2 (piora muito) a +2 (melhora muito), sempre em relação à referência (A). Dimensões fixas: ambiental, social, econômica, institucional e fiscal, as mesmas da nota técnica (parte 7).'),
      grafico('grafico-potencialidades.png', 860, 315),
      legendaFig('Exemplo ilustrativo, dados fictícios. Fonte: avaliação do autor com base em [evidências].'),
      tabela([2600, 1700, 1700, 8400], [
        ['Dimensão', 'B', 'C', 'Por que (1 linha)'],
        ['Ambiental', '[−2 a +2]', '[−2 a +2]', '[Motivo]'],
        ['Social', '[−2 a +2]', '[−2 a +2]', '[Motivo]'],
        ['Econômica', '[−2 a +2]', '[−2 a +2]', '[Motivo]'],
        ['Institucional e fiscal', '[−2 a +2]', '[−2 a +2]', '[Motivo]'],
      ]),
      h2('Síntese da comparação'),
      dica('Até 3 linhas: qual cenário entrega mais proteção com menor custo, e o que a comparação muda na conclusão da nota técnica (parte 11).'),
      vaga(),

      h1('Fontes'),
      item('Texto vigente: [endereço oficial, data de acesso]'),
      item('Texto proposto: [endereço oficial da versão analisada, data]'),
      item('Dados das partes B e C: [fonte, ano e premissas de cada série]'),
      p([t('Em caso de diferença entre este quadro e as fontes oficiais, valem as fontes oficiais.', { size: 16, color: DICA })], { spacing: { before: 160 } }),
    ],
  }],
})

// ---------------- GUIA DA METODOLOGIA (A4 retrato) ----------------
const txt = (texto) => p([t(texto, { size: 21, color: CINZA })])
const def = (termo, texto) => p([t(termo + ' ', { bold: true, size: 21 }), t(texto, { size: 21, color: CINZA })])
const guia = new Document({
  creator: 'ênfase jur', title: 'Metodologia padrão de análise', styles: estilos, numbering: numeracao,
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1300, bottom: 1300, left: 1440, right: 1440 } } },
    headers: { default: cabecalho('Metodologia padrão de análise') },
    footers: { default: rodape('Metodologia padrão de análise') },
    children: [
      p([t('METODOLOGIA PADRÃO DE ANÁLISE', { bold: true, size: 30, color: CINZA })], { spacing: { after: 40 } }),
      p([t('Como o observatório lê, testa e classifica as propostas legislativas ambientais', { size: 24, color: DICA, italics: true })], { spacing: { after: 60 } }),
      p([t('Versão do método 1.0 · outubro de 2026', { size: 18, color: DICA })], { spacing: { after: 160 } }),

      h1('1. Para que serve'),
      txt('Qualificar o debate com método científico padronizado: descrição do ato normativo, exposição do problema, hipótese, dados, cenários e soluções, sempre na mesma ordem, para que qualquer análise possa ser comparada com outra e conferida por quem discorda.'),
      txt('Toda análise é escrita e assinada pelo autor indicado, que responde por ela. A automação só captura e organiza dados e textos oficiais (proposições, versões, tramitação, votações, texto vigente das leis); nunca escreve, resume, compara ou interpreta.'),

      h1('2. Os produtos e como se ligam'),
      tabela([2000, 2300, 4726], [
        ['Produto', 'Para quem', 'O que traz'],
        ['Parecer no site', 'Qualquer leitor', 'Parecer prévio: texto base (literal, com o como é hoje × como fica da lei alterada), síntese, objeto e alcance, regime vigente e proposta, classificação, relevância, pontos de atenção e tramitação.'],
        ['Nota técnica (PDF)', 'Quem decide, imprensa, pesquisa', 'O parecer completo em 3 páginas de análise: texto base, leitura do cotejo, problema, hipóteses, impactos, cenários, soluções, casos, conclusão e limitações.'],
        ['Quadro comparativo (PDF)', 'Quem quer conferir', 'A. cotejo literal artigo por artigo; B. testagem das hipóteses; C. comparação de potencialidades entre cenários, com gráficos.'],
        ['Planilha de hipóteses e gráficos', 'Uso interno do autor', 'Os números da testagem e dos cenários; gera os gráficos do quadro com as cores padrão.'],
      ]),
      p(t(''), { spacing: { after: 60 } }),
      txt('A cadeia de coerência é sempre a mesma: hipóteses (nota, parte 6) → testagem (quadro, parte B) → comparação de cenários (quadro, parte C) → conclusão (nota, parte 11) → classificação publicada no site. Um elo que muda obriga a revisar os seguintes.'),

      h1('3. Etapas e prazos'),
      new Paragraph({ numbering: { reference: 'recs', level: 0 }, children: [t('Monitoramento diário das fontes oficiais (automático).', { size: 21, color: CINZA })] }),
      new Paragraph({ numbering: { reference: 'recs', level: 0 }, children: [t('Triagem: o dicionário de palavras-chave sugere; o autor decide o que entra, o que é só acompanhado e o que sai.', { size: 21, color: CINZA })] }),
      new Paragraph({ numbering: { reference: 'recs', level: 0 }, children: [t('Dossiê: texto integral, versões, tramitação, autores e texto vigente da lei alterada (automático).', { size: 21, color: CINZA })] }),
      new Paragraph({ numbering: { reference: 'recs', level: 0 }, children: [t('Análise e redação pelo autor, nos modelos fixos.', { size: 21, color: CINZA })] }),
      new Paragraph({ numbering: { reference: 'recs', level: 0 }, children: [t('Publicação em até 4 dias da saída da proposta (ou da nova versão do texto).', { size: 21, color: CINZA })] }),
      new Paragraph({ numbering: { reference: 'recs', level: 0 }, children: [t('Atualização: texto mudou, o parecer ganha nova versão com "o que mudou"; o histórico fica público.', { size: 21, color: CINZA })] }),

      h1('4. Leitura do texto'),
      def('Texto base.', 'Transcrição literal do arquivo oficial, sem edição, sempre com a versão e a data analisadas.'),
      def('Lei alterada.', 'Redação vigente tirada da compilação oficial (normas.leg.br para leis federais; texto conferido pela equipe para as estaduais), ao lado da redação proposta.'),
      def('Divergência.', 'Valem sempre as fontes oficiais. Os documentos dizem isso expressamente.'),

      h1('5. Classificação'),
      h2('5.1 Caráter: para que lado a proposta move a proteção ambiental'),
      tabela([2400, 6626], [
        ['Caráter', 'Quando usar'],
        ['Maléfico', 'Reduz ou retira proteção existente de forma direta: dispensa estudo, libera atividade antes proibida, diminui área protegida.'],
        ['Enfraquece indiretamente', 'Não muda a proteção de forma direta, mas cria condições para o dano: corta fiscalização ou orçamento, amplia prazos, cria exceções que dependem de regulamento.'],
        ['Neutro', 'Organiza procedimentos, cria datas comemorativas ou ajusta regras sem mudar o nível de proteção.'],
        ['Benéfico', 'Amplia ou cria proteção: novas áreas protegidas, metas de recuperação, regras mais rigorosas, mais transparência.'],
      ]),
      h2('5.2 Impacto: o tamanho do efeito'),
      tabela([2400, 6626], [
        ['Impacto', 'Quando usar'],
        ['Alto', 'Atinge um bioma inteiro, uma norma geral (como o licenciamento) ou muitas pessoas; ou o dano é difícil de reverter.'],
        ['Médio', 'Efeito regional ou setorial, com possibilidade de correção por regulamento ou fiscalização.'],
        ['Baixo', 'Efeito local, pontual ou só procedimental.'],
      ]),
      txt('Na dúvida entre dois níveis, usa-se o mais alto e explica-se o motivo.'),

      h1('6. Cotejo'),
      txt('Pontos principais (3 a 5) no formato regime vigente × proposta, cada lado como enunciado objetivo, sem adjetivos, com o efeito na proteção ambiental: ↑ amplia, ↓ reduz, = sem efeito direto. O detalhe artigo por artigo vai no quadro comparativo, parte A, só com transcrição.'),

      h1('7. Hipóteses'),
      def('Formato.', '"Se aprovada, a proposta tende a produzir [efeito], porque [mecanismo]."'),
      def('Indicador.', 'O que medir e onde (fonte, unidade, ano da linha de base).'),
      def('Sentido e limiar.', 'Aumento ou redução, e a variação que sustenta a hipótese, fixados antes de olhar o resultado.'),
      def('Quantidade.', 'De 1 a 3 por nota. Opinião, valor ou desejo não são hipóteses: precisam poder ser derrubadas por um dado.'),

      h1('8. Testagem e confiança'),
      tabela([2600, 6426], [
        ['Resultado', 'Critério'],
        ['Sustentada', 'Atinge o limiar no sentido esperado, com evidência de confiança alta ou média.'],
        ['Sustentada em parte', 'Atinge ao menos metade do limiar, ou o limiar só com evidência de confiança baixa.'],
        ['Não sustentada', 'Fica abaixo da metade do limiar ou vai no sentido contrário.'],
        ['Inconclusiva', 'Falta dado ou caso comparável. Dizer o que faltou e como obter.'],
      ]),
      p(t(''), { spacing: { after: 60 } }),
      tabela([2600, 6426], [
        ['Confiança', 'Quando usar'],
        ['Alta', 'Dado oficial com série histórica, ou estudo revisado por pares aplicável ao caso.'],
        ['Média', 'Dado oficial parcial, ou caso comparável de outra jurisdição.'],
        ['Baixa', 'Estimativa, caso único, ou dado sem método publicado.'],
      ]),
      txt('A planilha sugere o resultado pelo critério; o resultado que vale é o do autor, com a justificativa em uma linha.'),

      h1('9. Cenários e potencialidades'),
      def('Cenários fixos.', 'A. referência (a proposta não é aprovada); B. aprovada como está; C. aprovada com os ajustes recomendados. Premissas escritas, mesmo indicador da H1, mesmo horizonte (padrão: 5 anos).'),
      def('Potencialidades.', 'Direção do efeito de B e C em relação a A, de −2 (piora muito) a +2 (melhora muito), em quatro dimensões fixas: ambiental, social, econômica, institucional e fiscal. Magnitude, prazo e reversibilidade vão na nota técnica (parte 7).'),

      h1('10. Gráficos'),
      tabela([2600, 6426], [
        ['Gráfico', 'Uso'],
        ['1. Trajetória com limiar', 'Linhas do indicador da H1 por cenário ao longo do horizonte, com a linha do limiar. Mostra se e quando cada cenário cruza o limiar.'],
        ['2. Potencialidades por dimensão', 'Barras de B e C a partir do zero (cenário A), de −2 a +2, uma faixa por dimensão.'],
      ]),
      p(t(''), { spacing: { after: 60 } }),
      item('Cores fixas dos cenários: A azul #2A78D6, B laranja #EB6834, C verde-água #1BAF7A; limiar em cinza #8A8984. Testadas para leitura por pessoas com daltonismo.'),
      item('Um eixo só (nunca dois eixos verticais). Barras começam no zero. Sem 3D, sem sombra, grade clara.'),
      item('Valor rotulado no fim de cada linha ou barra, e a tabela de dados junto do gráfico.'),
      item('Abaixo de cada gráfico: fonte, ano e premissas. Dado fictício nunca é publicado.'),

      h1('11. Fontes e evidências'),
      txt('Ordem de preferência: fontes oficiais (casas legislativas, diários oficiais, órgãos ambientais, IBGE, INPE); estudos revisados por pares; dados de organizações com método publicado; imprensa só para contexto, nunca como dado.'),

      h1('12. Fundamentos'),
      item('Análise de Impacto Regulatório: Decreto nº 10.411/2020 (problema, objetivos, alternativas, impactos, comparação).'),
      item('Consequências práticas da decisão: art. 20 da LINDB, incluído pela Lei nº 13.655/2018.'),
      item('Boas práticas regulatórias da OCDE: avaliação baseada em evidências e transparente.'),
      item('Técnica legislativa: Lei Complementar nº 95/1998 (como as alterações são redigidas e lidas).'),
      item('Proteção ambiental: art. 225 da Constituição e competências da LC nº 140/2011.'),

      h1('13. Versões, correções e rastreabilidade'),
      txt('Cada parecer informa a versão do texto analisado. Os PDFs saem carimbados em cada página com a identificação do parecer (versão, texto analisado, autor), o link permanente e um QR que levam à versão atual no site. Correções são registradas publicamente na página do parecer.'),

      h1('14. Antes de publicar'),
      item('Texto base e versão analisada conferidos com a fonte oficial.'),
      item('Hipóteses com indicador, sentido e limiar fixados antes da testagem.'),
      item('Resultado de cada hipótese na conclusão, coerente com o quadro (parte B).'),
      item('Gráficos com cores padrão, fonte e ano; nenhum dado fictício.'),
      item('Classificação (caráter e impacto) justificada em uma linha cada.'),
      item('Limitações escritas: o que não foi possível verificar e por quê.'),
      p([t('O método é público e pode ser revisto. Mudanças geram nova versão desta metodologia, com data.', { size: 16, color: DICA })], { spacing: { before: 200 } }),
    ],
  }],
})

;(async () => {
  fs.writeFileSync(path.join(SAIDA, 'modelo-nota-tecnica.docx'), await Packer.toBuffer(nota))
  fs.writeFileSync(path.join(SAIDA, 'modelo-quadro-comparativo.docx'), await Packer.toBuffer(quadro))
  fs.writeFileSync(path.join(SAIDA, 'guia-metodologia.docx'), await Packer.toBuffer(guia))
  console.log('ok')
})()
