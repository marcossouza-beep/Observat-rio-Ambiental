// Gera o exemplo didático (parecer técnico e quadro comparativo) sobre a Lei nº 15.190/2025, no padrão dos modelos.
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
const h1 = (texto) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [t(texto, { bold: true, size: 23, color: VERDE })], spacing: { before: 160, after: 60 }, border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: LINHA, space: 2 } } })
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

// ======================================================================================
// EXEMPLO: Lei nº 15.190/2025 (Lei Geral do Licenciamento Ambiental), arts. 9º e 22
// Textos legais transcritos das fontes oficiais (Câmara/Legin, CONAMA, normas.leg.br), consulta em 30/10/2026.
// ======================================================================================
const W = 9026
const txt = (texto) => p([t(texto, { size: 20, color: CINZA })], { spacing: { after: 50, line: 250 } })
const neg = (rotulo, texto) => p([t(rotulo + ' ', { bold: true, size: 20 }), t(texto, { size: 20, color: CINZA })], { spacing: { after: 40, line: 250 } })
const lit = (texto) => p([t(texto, { font: 'Times New Roman', size: 20, color: '333333' })], { indent: { left: 360 }, spacing: { after: 50, line: 252 }, border: { left: { style: BorderStyle.SINGLE, size: 8, color: LINHA, space: 8 } } })
const fonte = (texto) => p([t(texto, { size: 16, color: DICA })], { spacing: { after: 100 } })
const aviso = () => p([t('EXEMPLO DIDÁTICO · ', { bold: true, size: 17, color: 'B23B3B' }), t('Preenchimento do modelo com uma lei real, para servir de referência. Não é parecer publicado nem assinado: num parecer real, a análise, a classificação e a assinatura são do autor. Textos legais e dados conferidos nas fontes em 30/10/2026; confira antes de reutilizar.', { size: 17, color: 'B23B3B' })], { spacing: { after: 140 }, border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'F2C9C9', space: 4 }, bottom: { style: BorderStyle.SINGLE, size: 4, color: 'F2C9C9', space: 4 } } })
const rec = (texto) => new Paragraph({ numbering: { reference: 'recs', level: 0 }, children: [t(texto, { size: 20, color: CINZA })], spacing: { after: 50 } })

const URL_LEI = 'https://www2.camara.leg.br/legin/fed/lei/2025/lei-15190-8-agosto-2025-797833-normaatualizada-pl.html'
const EMENTA = 'Dispõe sobre o licenciamento ambiental; regulamenta o inciso IV do § 1º do art. 225 da Constituição Federal; altera as Leis nºs 9.605, de 12 de fevereiro de 1998 (Lei dos Crimes Ambientais), 9.985, de 18 de julho de 2000, e 6.938, de 31 de agosto de 1981; revoga dispositivos das Leis nºs 7.661, de 16 de maio de 1988, e 11.428, de 22 de dezembro de 2006; e dá outras providências.'
const NOTA_VETO = '(Vetado pelo Presidente da República, mantido pelo Congresso Nacional e publicado no DOU de 8/12/2025)'
const ART9 = [
  'Art. 9º Quando atendido ao previsto neste artigo, não são sujeitos a licenciamento ambiental as seguintes atividades e empreendimentos:',
  'I - cultivo de espécies de interesse agrícola, temporárias, semiperenes e perenes;',
  'II - pecuária extensiva e semi-intensiva;',
  'III - pecuária intensiva de pequeno porte, nos termos do § 1º do art. 4º desta Lei;',
  'IV - pesquisa de natureza agropecuária, que não implique risco biológico, desde que haja autorização prévia dos órgãos competentes e ressalvado o disposto na Lei nº 11.105, de 24 de março de 2005.',
  '§ 1º O previsto no caput deste artigo aplica-se às propriedades e às posses rurais, desde que regulares ou em regularização, na forma da Lei nº 12.651, de 25 de maio de 2012, considerando-se:',
  'I - regular o imóvel com registro no Cadastro Ambiental Rural (CAR) homologado pelo órgão estadual competente, que não tenha déficit de vegetação em reserva legal ou área de preservação permanente; e',
  'II - em regularização o imóvel quando atendidas quaisquer das seguintes condições:',
  'a) tenha registro no CAR pendente de homologação; (Alínea vetada pelo Presidente da República, mantida pelo Congresso Nacional e publicada no DOU de 8/12/2025)',
  'b) tenha ocorrido a adesão ao Programa de Regularização Ambiental (PRA), durante todo o período de cumprimento das obrigações nele assumidas; ou',
  'c) tenha firmado com o órgão competente termo de compromisso próprio para a regularização de déficit de vegetação em reserva legal ou em área de preservação permanente, quando não for o caso de adesão ao PRA.',
  '§ 2º O previsto no caput deste artigo não afasta a realização de atividades de fiscalização pelo órgão ambiental competente, inclusive a imposição das sanções aplicáveis no caso de infrações, bem como não dispensa o cumprimento das obrigações relativas ao uso alternativo do solo na propriedade ou na posse rural que constem expressamente da legislação ou dos planos de manejo de unidades de conservação da natureza, notadamente no que se refere ao uso de agrotóxicos, à conservação do solo e ao direito de uso dos recursos hídricos.',
  '§ 3º A não sujeição ao licenciamento ambiental de que trata este artigo não exime o empreendedor da obtenção, quando exigível, de licença ambiental, de autorização ou de instrumento congênere, para a supressão de vegetação nativa, para o uso de recursos hídricos ou para outras formas de utilização de recursos ambientais previstas em legislação específica.',
  '§ 4º As autoridades licenciadoras disponibilizarão, de forma gratuita e automática, nos seus sítios eletrônicos, bem como no subsistema de informações previsto no art. 35 desta Lei, certidão declaratória de não sujeição da atividade ou do empreendimento ao licenciamento ambiental.',
  '§ 5º As atividades e os empreendimentos de pecuária intensiva de médio porte poderão ser licenciados mediante procedimento simplificado na modalidade por adesão e compromisso, respeitado o disposto nos §§ 1º, 2º e 3º deste artigo.',
  '§ 6º A inscrição no CAR não pode ser exigida como requisito para a licença de atividades ou de empreendimentos de infraestrutura de transportes e de energia que sejam instalados na propriedade ou na posse rural, mas que não tenham relação com as atividades referidas no caput deste artigo.',
  '§ 7º São de utilidade pública as barragens de pequeno porte, nos termos do § 1º do art. 4º desta Lei, para fins de irrigação. (Parágrafo vetado pelo Presidente da República, mantido pelo Congresso Nacional e publicado no DOU de 8/12/2025)',
]
const ART22 = [
  'Art. 22. O licenciamento ambiental simplificado pela modalidade por adesão e compromisso pode ocorrer se forem atendidas, cumulativamente, as seguintes condições: (“Caput” do artigo vetado pelo Presidente da República, mantido pelo Congresso Nacional e publicado no DOU de 8/12/2025)',
  'I - a atividade ou o empreendimento for qualificado, simultaneamente, como de pequeno ou médio porte e baixo ou médio potencial poluidor; (Inciso vetado pelo Presidente da República, mantido pelo Congresso Nacional e publicado no DOU de 8/12/2025)',
  'II - serem previamente conhecidos: a) as características gerais da região de implantação; b) as condições de instalação e de operação da atividade ou do empreendimento; c) os impactos ambientais da tipologia da atividade ou do empreendimento; e d) as medidas de controle ambiental necessárias; (Inciso vetado pelo Presidente da República, mantido pelo Congresso Nacional e publicado no DOU de 8/12/2025)',
  'III - (Inciso vetado pelo Presidente da República, mantido pelo Congresso Nacional e publicado no DOU de 8/12/2025, e revogado pela Lei nº 15.300, de 22/12/2025)',
  'IV - não incorrer nas hipóteses de atividades ou de empreendimentos: a) minerários, exceto exploração de areia, cascalho, brita e lavra de diamante por faiscação sem desmonte de talude; b) que demandem supressão de vegetação nativa que dependa de autorização específica, exceto o caso de corte de árvores isoladas; c) que envolvam remoção ou realocação de população; d) localizados em área declarada como contaminada, segundo as normas técnicas vigentes; e) localizados no interior de unidades de conservação, exceto em Área de Proteção Ambiental (APA); f) localizados em áreas reconhecidas como Sítios Ramsar, nos termos da Convenção sobre Zonas Úmidas de Importância Internacional, especialmente como Habitat de Aves Aquáticas (Convenção de Ramsar); g) localizados em áreas de bens arqueológicos ou culturais acautelados; h) localizados em terras indígenas, territórios quilombolas e de comunidades tradicionais, exceto se realizados pela própria comunidade; i) localizados em áreas suscetíveis à ocorrência de deslizamentos de grande impacto, inundações bruscas ou processos geológicos ou hidrológicos, previstas no art. 42-A da Lei nº 10.257, de 10 de julho de 2001; j) que tiveram ou venham a ter licença de instalação negada por incompatibilidade ambiental da área com o tipo de atividade; e k) localizados no mar territorial. (Inciso acrescido pela Lei nº 15.300, de 22/12/2025)',
  '§ 1º São considerados atividades e empreendimentos passíveis de licenciamento ambiental pelo procedimento por adesão e compromisso aqueles definidos em ato específico do ente federativo competente, nos termos da Lei Complementar nº 140, de 8 de dezembro de 2011. (Parágrafo vetado pelo Presidente da República, mantido pelo Congresso Nacional e publicado no DOU de 8/12/2025)',
  '§ 2º A autoridade licenciadora deve estabelecer previamente as condicionantes ambientais da LAC que o empreendedor deverá cumprir. (Parágrafo vetado pelo Presidente da República, mantido pelo Congresso Nacional e publicado no DOU de 8/12/2025)',
  '§ 3º As informações apresentadas pelo empreendedor no RCE poderão ser analisadas pela autoridade licenciadora por amostragem. (Parágrafo vetado pelo Presidente da República, mantido pelo Congresso Nacional e publicado no DOU de 8/12/2025)',
  '§ 4º A autoridade licenciadora realizará, anualmente, vistorias por amostragem, para aferir a regularidade de atividades ou de empreendimentos licenciados pelo processo por adesão e compromisso, e deverá disponibilizar os resultados no subsistema de informações previsto no art. 35 desta Lei. (Parágrafo vetado pelo Presidente da República, mantido pelo Congresso Nacional e publicado no DOU de 8/12/2025)',
  '§ 5º O resultado das vistorias de que trata o § 4º orientará a manutenção ou a revisão do ato referido no § 1º deste artigo sobre as atividades e os empreendimentos passíveis de licenciamento ambiental pelo procedimento por adesão e compromisso. (Parágrafo vetado pelo Presidente da República, mantido pelo Congresso Nacional e publicado no DOU de 8/12/2025)',
  '§ 6º A LAC para a extração de recursos naturais deve prever o limite de exploração pelo titular da licença, respeitada a capacidade de suporte do meio ambiente. (Parágrafo acrescido pela Lei nº 15.300, de 22/12/2025)',
]
const CONAMA_2 = 'Art. 2º A localização, construção, instalação, ampliação, modificação e operação de empreendimentos e atividades utilizadoras de recursos ambientais consideradas efetiva ou potencialmente poluidoras, bem como os empreendimentos capazes, sob qualquer forma, de causar degradação ambiental, dependerão de prévio licenciamento do órgão ambiental competente, sem prejuízo de outras licenças legalmente exigíveis. § 1º Estão sujeitos ao licenciamento ambiental os empreendimentos e as atividades relacionadas no anexo 1, parte integrante desta Resolução. § 2º Caberá ao órgão ambiental competente definir os critérios de exigibilidade, o detalhamento e a complementação do anexo 1, levando em consideração as especificidades, os riscos ambientais, o porte e outras características do empreendimento ou atividade.'
const CONAMA_ANEXO = 'Anexo 1 · Atividades agropecuárias: - projeto agrícola; - criação de animais; - projetos de assentamentos e de colonização.'
const CONAMA_12 = 'Art. 12. [...] § 1º Poderão ser estabelecidos procedimentos simplificados para as atividades e empreendimentos de pequeno potencial de impacto ambiental, que deverão ser aprovados pelos respectivos Conselhos de Meio Ambiente.'
const L6938_10 = 'Art. 10. A construção, instalação, ampliação e funcionamento de estabelecimentos e atividades utilizadores de recursos ambientais, efetiva ou potencialmente poluidores ou capazes, sob qualquer forma, de causar degradação ambiental dependerão de prévio licenciamento ambiental. (“Caput” do artigo com redação dada pela Lei Complementar nº 140, de 8/12/2011)'
const L15190_4 = 'Art. 4º A construção, a instalação, a ampliação e a operação de atividade ou de empreendimento utilizador de recursos ambientais, efetiva ou potencialmente poluidor ou capaz, sob qualquer forma, de causar degradação do meio ambiente estão sujeitas a prévio licenciamento ambiental perante a autoridade licenciadora integrante do Sisnama, sem prejuízo das demais licenças, outorgas e autorizações cabíveis.'

const pareceres = new Document({
  creator: 'ênfase jur', title: 'Exemplo: parecer técnico sobre a Lei nº 15.190/2025', styles: estilos, numbering: numeracao,
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1200, bottom: 1700, left: 1300, right: 1300, footer: 1150 } } },
    headers: { default: cabecalho('Parecer técnico · exemplo', 9306) },
    footers: { default: rodape('Parecer técnico · exemplo') },
    children: [
      p([t('PARECER TÉCNICO Nº 001/2026', { bold: true, size: 30, color: CINZA })], { spacing: { after: 40 } }),
      p([t('Lei nº 15.190/2025 (Lei Geral do Licenciamento Ambiental): dispensa de licenciamento de atividades agropecuárias (art. 9º) e licença por adesão e compromisso (art. 22)', { size: 22, color: CINZA, italics: true })], { spacing: { after: 100 } }),
      aviso(),

      h1('0. Ficha técnica'),
      ficha(9306, [
        ['Norma', 'Lei nº 15.190, de 8 de agosto de 2025 · federal · origem: PL 3.729/2004 (Câmara) e PL 2.159/2021 (Senado)'],
        ['Etapa', 'Em vigor desde 4/2/2026 (180 dias da publicação, art. 67). Vetos derrubados em 27/11/2025 (partes publicadas no DOU de 8/12/2025). Alterada pela Lei nº 15.300/2025. Validade em exame no STF (ADIs 7.913, 7.916 e 7.919 e ADC 102).'],
        ['Recorte', 'Art. 9º (não sujeição de atividades agropecuárias) e art. 22 (licença por adesão e compromisso, LAC). A lei tem 67 artigos; os demais ficam fora deste parecer.'],
        ['Texto analisado', 'Texto atualizado da Câmara dos Deputados (Legin), consulta em 30/10/2026'],
        ['Norma vigente afetada', 'Resolução CONAMA nº 237/1997 (art. 2º, art. 12 e Anexo 1), que regulava o art. 10 da Lei nº 6.938/1981'],
        ['Impacto · caráter', 'Alto · Maléfico (enfraquece diretamente)'],
        ['Temas · biomas', 'Licenciamento, florestas, agropecuária · todos os biomas, com maior pressão no Cerrado e na Amazônia'],
        ['Versão', 'Versão 1 · exemplo didático · autor: [nome do autor, título]'],
        ['Link permanente', 'Carimbado pelo sistema em cada página ao baixar'],
        ['Quadro comparativo', 'Sim · documento à parte (cotejo, testagem das hipóteses e cenários)'],
      ]),

      h1('1. Texto base'),
      h2('1.1 Ementa'),
      lit(EMENTA),
      h2('1.2 Dispositivos centrais (texto vigente)'),
      lit(ART9[0]), lit(ART9[1]), lit(ART9[2]), lit(ART9[3]), lit(ART9[5]), lit(ART9[7]), lit(ART9[8]), lit(ART9[12]),
      lit(ART22[0]), lit(ART22[1]), lit(ART22[7]),
      fonte('Transcrição literal; íntegra dos arts. 9º e 22 no Anexo I. Fonte: Câmara dos Deputados, Legin, texto atualizado.'),
      h2('1.3 Regime anterior × regime novo (transcrição)'),
      tabela([1500, 3803, 3803], [
        ['Tema', 'Regime anterior', 'Lei nº 15.190/2025'],
        ['Atividades agropecuárias', 'CONAMA 237/1997, art. 2º, § 1º: "Estão sujeitos ao licenciamento ambiental os empreendimentos e as atividades relacionadas no anexo 1". Anexo 1: "Atividades agropecuárias: projeto agrícola; criação de animais [...]"', 'Art. 9º: "não são sujeitos a licenciamento ambiental [...] I - cultivo de espécies de interesse agrícola [...]; II - pecuária extensiva e semi-intensiva; III - pecuária intensiva de pequeno porte"'],
        ['Procedimento simplificado', 'CONAMA 237/1997, art. 12, § 1º: "procedimentos simplificados para as atividades e empreendimentos de pequeno potencial de impacto ambiental, que deverão ser aprovados pelos respectivos Conselhos de Meio Ambiente"', 'Art. 22, I: LAC para atividade "de pequeno ou médio porte e baixo ou médio potencial poluidor"; § 3º: informações "analisadas [...] por amostragem"'],
      ]),
      fonte('A lei não mudou a redação do art. 10 da Lei nº 6.938/1981 (prévio licenciamento); mudou as regras que o aplicam.'),

      h1('2. Síntese'),
      txt('Com os vetos derrubados, a lei deixa de sujeitar ao licenciamento o cultivo agrícola e a pecuária extensiva, semi-intensiva e intensiva de pequeno porte, em imóveis regulares ou em regularização, incluído o imóvel com CAR apenas pendente de homologação, e admite a licença por adesão e compromisso para atividades de médio porte e médio potencial poluidor. O problema central é que a dispensa recai sobre o vetor de mais de 97% da perda de vegetação nativa no país, enquanto a regularidade do imóvel se apoia num cadastro analisado em cerca de 6% dos casos. A hipótese principal, de que a dispensa interrompe a queda do desmatamento, ainda não pode ser testada: os dados de 2026 saem em maio de 2027.'),

      h1('3. Descrição do ato normativo'),
      h2('3.1 Objeto e alcance'),
      txt('Lei geral, nacional, aplicável à União, aos estados, ao DF e aos municípios (art. 1º, § 1º). No recorte: (a) não sujeição de atividades agropecuárias ao licenciamento, condicionada à regularidade do imóvel nos termos do Código Florestal (art. 9º); (b) licença por adesão e compromisso, emitida a partir de declaração do empreendedor, com análise por amostragem (art. 22). Atinge imóveis rurais de todo o país e vale para processos iniciados a partir de 4/2/2026 (art. 60).'),
      h2('3.2 Como funcionava (linha de base)'),
      txt('O licenciamento seguia o art. 10 da Lei nº 6.938/1981 e a Resolução CONAMA nº 237/1997, que listava "projeto agrícola" e "criação de animais" entre as atividades sujeitas a licenciamento e deixava ao órgão competente os critérios de exigibilidade por porte e risco (art. 2º, § 2º). Simplificação só para pequeno potencial de impacto, aprovada pelo conselho de meio ambiente (art. 12, § 1º).'),

      h1('4. Análise do quadro comparativo'),
      h2('4.1 Pontos principais'),
      tabela([1500, 3000, 3300, 1506], [
        ['Ponto', 'Regime anterior', 'Lei nº 15.190/2025', 'Efeito'],
        ['1 · Art. 9º, caput', 'Projeto agrícola e criação de animais sujeitos a licenciamento, com critérios do órgão competente.', 'Cultivo agrícola e pecuária extensiva, semi-intensiva e intensiva de pequeno porte não sujeitos a licenciamento.', '↓ Reduz'],
        ['2 · Art. 9º, § 1º, II, a', 'Regularidade do imóvel aferida no próprio licenciamento.', 'CAR pendente de homologação basta para o imóvel contar como "em regularização".', '↓ Reduz'],
        ['3 · Art. 9º, § 3º', 'Supressão de vegetação nativa e uso da água dependem de autorização própria.', 'Mantido: a dispensa não exime dessas autorizações.', '= Sem efeito direto'],
        ['4 · Art. 22, caput e I', 'Simplificação só para pequeno potencial de impacto, aprovada pelo conselho.', 'LAC para pequeno ou médio porte e baixo ou médio potencial poluidor, por declaração do empreendedor.', '↓ Reduz'],
        ['5 · Art. 22, § 3º', 'Informações analisadas antes da licença.', 'Informações analisadas por amostragem.', '↓ Reduz'],
      ]),
      h2('4.2 Leitura do cotejo'),
      txt('O controle sai do momento prévio (licença, com análise de localização e condicionantes) e passa a dois filtros: a autorização de supressão de vegetação (art. 9º, § 3º) e a fiscalização posterior (§ 2º). Três pontos ficam abertos: (i) "pequeno porte" depende das tipologias de cada ente (art. 4º, § 1º), o que tende a criar regimes diferentes entre estados; (ii) basta CAR pendente, num sistema com 5,9% de análises concluídas; (iii) a vistoria por amostragem da LAC (art. 22, § 4º) não tem amostra mínima. A vedação da LAC quando há supressão de vegetação nativa (art. 22, IV, b) é a principal salvaguarda.'),

      h1('5. Exposição do problema'),
      h2('5.1 Problema declarado'),
      txt('Falta de norma geral (o licenciamento era regulado por resoluções do Conama e normas estaduais), insegurança jurídica e demora dos processos, que oneram atividades de baixo impacto. [Num parecer real, transcreva o trecho da justificação ou do parecer do relator.]'),
      h2('5.2 Problema identificado'),
      neg('Causa:', 'a dispensa e a LAC são definidas por tipo de atividade, não pela localização nem pelo risco do caso concreto.'),
      neg('Efeito:', 'atividades com potencial de conversão de vegetação passam a depender só da autorização de supressão e da fiscalização posterior, apoiadas num cadastro (CAR) majoritariamente não analisado.'),
      neg('Quem sofre:', 'os biomas sob maior pressão (o Cerrado concentrou 54,9% do desmatamento em 2025), as populações do entorno e os órgãos ambientais, que perdem a etapa de análise prévia.'),
      h2('5.3 Evidências'),
      tabela([4600, 3006, 1700], [
        ['Dado', 'Fonte e ano', 'Confiança'],
        ['Área desmatada: 2.069.695 ha (2022), 1.829.597 ha (2023), 1.242.079 ha (2024), 984.794 ha (2025)', 'MapBiomas, RAD 2023, 2024 e 2025', 'Média'],
        ['Mais de 97% da perda de vegetação nativa de 2019 a 2024 teve a agropecuária como vetor', 'MapBiomas, RAD 2024', 'Média'],
        ['Cerrado: 540.614 ha desmatados em 2025, 54,9% do total do país', 'MapBiomas, RAD 2025', 'Média'],
        ['CAR: 8.154.567 cadastros e 480.700 análises concluídas (5,9%) no fim de 2025', 'SFB/Sicar, citado pelo Portal DBO', 'Média'],
      ]),
      fonte('MapBiomas: rede científica com método publicado, não estatística oficial (confiança média). CAR: dado oficial obtido em fonte secundária (confiança média).'),

      h1('6. Hipóteses'),
      tabela([600, 3900, 2200, 1206, 1400], [
        ['Nº', 'Hipótese', 'Indicador e fonte', 'Sentido', 'Limiar'],
        ['H1', 'Mantida a dispensa do art. 9º, a área desmatada anual tende a parar de cair, porque a abertura de áreas para cultivo e pecuária deixa de passar por análise de localização e condicionantes.', 'Área desmatada no Brasil · MapBiomas, RAD', 'Aumento', 'Variação ≥ 0% sobre 2025 (984.794 ha)'],
        ['H2', 'A dispensa recai sobre o vetor que concentra a perda de vegetação nativa no país.', 'Participação da agropecuária na área desmatada · MapBiomas', 'Acima de', '80%'],
        ['H3', 'O filtro de regularidade do § 1º tende a ser declaratório, porque a maior parte dos cadastros no CAR não foi analisada.', 'Cadastros com análise concluída · SFB/Sicar', 'Abaixo de', '50%'],
      ]),

      h1('7. Impactos potenciais'),
      h2('7.1 Por dimensão'),
      tabela([1700, 900, 1300, 1100, 1300, 3006], [
        ['Dimensão', 'Direção', 'Magnitude', 'Prazo', 'Reversível?', 'Quem é afetado'],
        ['Ambiental', '−2', 'Alta', 'Longo', 'Em parte não', 'Vegetação nativa do Cerrado e da Amazônia; água e solo'],
        ['Social', '−1', 'Média', 'Longo', 'Em parte', 'Populações do entorno e comunidades tradicionais'],
        ['Econômica', '+1', 'Média', 'Curto', 'Sim', 'Produtores rurais (menos custo e prazo)'],
        ['Institucional e fiscal', '−1', 'Média', 'Curto', 'Sim', 'Órgãos ambientais estaduais (fiscalização posterior)'],
      ]),
      h2('7.2 Compatibilidade jurídica'),
      txt('O art. 225, § 1º, IV, da Constituição exige estudo prévio para atividade potencialmente causadora de significativa degradação; a dispensa por categoria está no centro das ADIs 7.913, 7.916 e 7.919 (julgamento adiado em agosto de 2026), e as razões do veto à LAC apontaram inconstitucionalidade. A LC nº 140/2011 e o art. 4º, § 1º, deixam aos entes as tipologias, o que abre espaço para regulamentação estadual. Risco de questionamento: alto.'),

      h1('8. Análise de cenários'),
      tabela([2500, 4106, 2700], [
        ['Cenário', 'Premissas', 'Resultado em 2030 (indicador da H1)'],
        ['A. Sem a dispensa (regime anterior)', 'Queda de 10% ao ano, metade do ritmo de 2024 para 2025', '582 mil ha'],
        ['B. Lei como está (vetos derrubados)', 'Alta de 5% ao ano com a abertura de áreas sem análise de localização', '1.257 mil ha (cruza o limiar já em 2026)'],
        ['C. Com os ajustes recomendados', 'Queda de 5% ao ano, com CAR analisado exigido nas regiões críticas', '762 mil ha'],
      ]),
      fonte('Trajetórias por premissa a partir da base de 2025, não previsões. Servem para tornar a H1 testável e serão confrontadas com o RAD de cada ano. Gráficos no quadro comparativo, parte C.'),

      h1('9. Soluções potenciais'),
      tabela([4300, 1500, 1500, 2006], [
        ['Opção', 'Eficácia', 'Custo', 'Viabilidade jurídica'],
        ['Regulamentação estadual: exigir CAR analisado (não só pendente) para a não sujeição em municípios prioritários de controle do desmatamento', 'Alta', 'Baixo', 'Média (pode ser questionada)'],
        ['Integrar a certidão de não sujeição (art. 9º, § 4º) aos alertas de desmatamento, com bloqueio automático quando houver alerta no imóvel', 'Alta', 'Baixo', 'Alta'],
        ['Alterar a lei para retirar a alínea a do § 1º, II, do art. 9º (CAR pendente)', 'Alta', 'Baixo', 'Média (depende do Congresso)'],
      ]),

      h1('10. Casos de referência'),
      tabela([1900, 2500, 2800, 2106], [
        ['Caso', 'O que foi feito', 'O que aconteceu', 'Comparabilidade'],
        ['PPCDAm (2004)', 'Monitoramento por satélite, fiscalização e restrições em municípios prioritários da Amazônia', 'Taxa do PRODES caiu de 27.772 km² (2004) para cerca de 4.600 km² (2012), redução de 83% a 84%', 'Média: mostra o peso do controle; outro instrumento e outro período'],
        ['Moratória da Soja (2006)', 'Compradores deixaram de adquirir soja de áreas da Amazônia desmatadas depois do acordo', 'Soja sobre desmatamento: de 30% da expansão antes para cerca de 1% depois; no Cerrado, fora do acordo, 20%', 'Média: controle privado de cadeia; o Cerrado mostra o que ocorre sem filtro'],
      ]),

      h1('11. Conclusão e recomendações'),
      tabela([700, 2400, 6206], [
        ['Nº', 'Resultado', 'Por quê (1 linha)'],
        ['H1', 'Inconclusiva', 'A lei vigora desde 4/2/2026; o RAD com dados de 2026 só sai em maio de 2027.'],
        ['H2', 'Sustentada', 'Mais de 97% da perda de vegetação nativa de 2019 a 2024 teve a agropecuária como vetor (confiança média).'],
        ['H3', 'Sustentada', '5,9% dos cadastros com análise concluída no fim de 2025, muito abaixo do limiar de 50% (confiança média).'],
      ]),
      txt('Impacto alto: norma geral e nacional sobre o vetor de 97% da perda de vegetação, com efeito difícil de reverter. Caráter maléfico: retira de forma direta a exigência de licenciamento, ainda que preserve a autorização de supressão.'),
      rec('Exigir CAR analisado para a não sujeição em municípios prioritários de controle do desmatamento. Destinatário: órgãos estaduais de meio ambiente.'),
      rec('Vincular a certidão de não sujeição aos alertas de desmatamento. Destinatário: MMA e órgãos estaduais.'),
      rec('Fixar meta pública de análise do CAR, a começar pelas áreas críticas. Destinatário: SFB e estados.'),
      rec('Rever a alínea a do § 1º, II, do art. 9º. Destinatário: Congresso Nacional.'),
      txt('Monitorar: RAD 2026 (maio de 2027) e RAD 2027; percentual de cadastros analisados (boletim do SFB); número de certidões de não sujeição emitidas (art. 35); julgamento das ADIs no STF.'),

      h1('12. Referências e limitações'),
      item('Lei nº 15.190/2025, texto atualizado: Câmara dos Deputados, Legin (consulta em 30/10/2026).'),
      item('Resolução CONAMA nº 237/1997 (PDF oficial do CONAMA) e Lei nº 6.938/1981, art. 10 (compilação vigente, normas.leg.br).'),
      item('MapBiomas, Relatório Anual do Desmatamento (RAD) 2023, 2024 e 2025.'),
      item('Serviço Florestal Brasileiro, dados do Sicar de dezembro de 2025, via Portal DBO.'),
      item('INPE/PRODES, via Climate Policy Initiative; Gibbs et al. (2015), Brazil’s Soy Moratorium, Science 347(6220).'),
      item('STF, ADIs 7.913, 7.916 e 7.919 e ADC 102; Rádio Senado, 26/8/2026 (julgamento adiado).'),
      neg('Limitações:', 'recorte de 2 dos 67 artigos; sem dados de desmatamento posteriores à vigência; boletim do SFB não conferido na fonte primária; valores de 2022 e 2023 como publicados em cada relatório (podem ter sido revistos); cenários são trajetórias por premissa; classificação ilustrativa.'),
      p([t('Exemplo de preenchimento do modelo. Um parecer técnico real é escrito e assinado pelo autor, que responde pelo conteúdo.', { size: 16, color: DICA })], { spacing: { before: 40, after: 0 } }),

      new Paragraph({ pageBreakBefore: true, heading: HeadingLevel.HEADING_1, children: [t('Anexo I. Arts. 9º e 22 da Lei nº 15.190/2025 (texto vigente)', { bold: true, size: 23, color: VERDE })], spacing: { after: 60 }, border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: LINHA, space: 2 } } }),
      p([t('Fonte: ', { bold: true, size: 18 }), t(`Câmara dos Deputados, Legin, texto atualizado · acesso em 30/10/2026 · íntegra: ${URL_LEI}`, { size: 18, color: CINZA })]),
      ...ART9.map(lit),
      ...ART22.map(lit),
    ],
  }],
})

// ---------------- QUADRO COMPARATIVO (A4 paisagem) ----------------
const WP = 14400
const quadroEx = new Document({
  creator: 'ênfase jur', title: 'Exemplo: quadro comparativo da Lei nº 15.190/2025', styles: estilos, numbering: numeracao,
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838, orientation: PageOrientation.LANDSCAPE }, margin: { top: 1100, bottom: 1650, left: 1219, right: 1219, footer: 1150 } } },
    headers: { default: cabecalho('Quadro comparativo · exemplo', WP) },
    footers: { default: rodape('Quadro comparativo · exemplo') },
    children: [
      p([t('QUADRO COMPARATIVO', { bold: true, size: 30, color: CINZA })], { spacing: { after: 40 } }),
      p([t('Lei nº 15.190/2025, arts. 9º e 22: cotejo dos textos, testagem das hipóteses e comparação de cenários', { size: 22, color: CINZA, italics: true })], { spacing: { after: 100 } }),
      aviso(),
      ficha(WP, [
        ['Norma', 'Lei nº 15.190, de 8 de agosto de 2025 (Lei Geral do Licenciamento Ambiental) · federal'],
        ['Texto proposto', 'Texto atualizado da Câmara (Legin), com os vetos derrubados (DOU de 8/12/2025) e a Lei nº 15.300/2025 · consulta em 30/10/2026'],
        ['Texto vigente', 'Regime anterior: Resolução CONAMA nº 237/1997 (PDF oficial) e Lei nº 6.938/1981, art. 10 (normas.leg.br)'],
        ['Parecer de referência', 'Parecer técnico nº 001/2026 (exemplo) · versão 1 · [autor]'],
      ]),

      h1('A. Cotejo dos textos'),
      tabela([1800, 6300, 6300], [
        ['Dispositivo', 'Regime anterior (literal)', 'Lei nº 15.190/2025 (literal)'],
        ['Regra geral', L6938_10, L15190_4],
        ['Agropecuária', CONAMA_2 + ' ' + CONAMA_ANEXO, ART9.slice(0, 5).join(' ')],
        ['Regularidade do imóvel', 'Sem correspondente: a regularidade era aferida no licenciamento.', ART9.slice(5, 11).join(' ')],
        ['Procedimento simplificado', CONAMA_12, [ART22[0], ART22[1], ART22[7]].join(' ')],
      ]),
      h2('Dispositivos novos (sem correspondente no regime anterior)'),
      tabela([1800, 12600], [['Dispositivo', 'Texto'], ['Art. 9º, § 3º', ART9[12].replace(/^§ 3º /, '')], ['Art. 9º, § 4º', ART9[13].replace(/^§ 4º /, '')], ['Art. 22, § 4º', ART22[8].replace(/^§ 4º /, '')]]),
      h2('Dispositivos revogados'),
      txt('Nenhum no recorte. (A lei revoga dispositivos das Leis nº 7.661/1988 e nº 11.428/2006, fora deste quadro.)'),

      h1('B. Testagem das hipóteses'),
      tabela([600, 3600, 2200, 1600, 1300, 1500, 1100, 2500], [
        ['Nº', 'Hipótese', 'Indicador · fonte', 'Linha de base', 'Limiar', 'Observado', 'Confiança', 'Resultado e por quê'],
        ['H1', 'Mantida a dispensa, a área desmatada anual tende a parar de cair.', 'Área desmatada · MapBiomas, RAD', '984.794 ha (2025)', 'Variação ≥ 0%', 'Sem dado (RAD 2026 em maio/2027)', '—', 'Inconclusiva · lei em vigor desde 4/2/2026'],
        ['H2', 'A dispensa recai sobre o vetor que concentra a perda de vegetação.', 'Participação da agropecuária · MapBiomas', '—', 'Acima de 80%', 'Mais de 97% (2019-2024)', 'Média', 'Sustentada · nível muito acima do limiar'],
        ['H3', 'O filtro de regularidade tende a ser declaratório.', 'Cadastros com análise concluída · SFB/Sicar', '8.154.567 cadastros (dez/2025)', 'Abaixo de 50%', '5,9% (480.700)', 'Média', 'Sustentada · ~1 em cada 17 cadastros analisado'],
      ]),
      p([t('Critérios: ', { bold: true, size: 18 }), t('sustentada, atinge o limiar no sentido esperado com evidência de confiança alta ou média; sustentada em parte, metade do limiar ou só com confiança baixa; não sustentada, abaixo da metade ou no sentido contrário; inconclusiva, sem dado suficiente.', { size: 18 })], { spacing: { before: 120 } }),

      new Paragraph({ children: [new PageBreak()] }),
      h1('C. Comparação de potencialidades'),
      h2('Gráfico 1. Área desmatada: observado (2022-2025) e cenários por premissa (2026-2030), com o limiar da H1'),
      grafico('grafico-trajetoria.png', 860, 366),
      legendaFig('Fonte: MapBiomas, RAD 2023 a 2025 (observado). Cenários: trajetórias por premissa a partir de 2025, não previsões (premissas abaixo).'),
      tabela([3600, 1800, 1800, 1800, 1800, 1800, 1800], [
        ['Cenário (mil ha/ano)', '2025', '2026', '2027', '2028', '2029', '2030'],
        ['A. Sem a dispensa: −10% ao ano', '985', '886', '798', '718', '646', '582'],
        ['B. Lei como está: +5% ao ano', '985', '1.034', '1.086', '1.140', '1.197', '1.257'],
        ['C. Com ajustes: −5% ao ano', '985', '936', '889', '844', '802', '762'],
      ]),
      new Paragraph({ children: [new PageBreak()] }),
      h2('Gráfico 2. Potencialidades por dimensão: B e C em relação ao cenário A'),
      grafico('grafico-potencialidades.png', 800, 302),
      legendaFig('Fonte: avaliação do autor (exemplo), com base nas evidências do parecer técnico, parte 5.3.'),
      tabela([2600, 1300, 1300, 9200], [
        ['Dimensão', 'B', 'C', 'Por que (1 linha)'],
        ['Ambiental', '−2', '−1', 'B retira a análise prévia do vetor de 97% da perda; C mantém o filtro nas áreas críticas.'],
        ['Social', '−1', '0', 'B amplia a conversão no entorno de comunidades; C a contém onde a pressão é maior.'],
        ['Econômica', '+1', '+1', 'Menos custo e prazo para o produtor nos dois cenários.'],
        ['Institucional e fiscal', '−1', '0', 'B transfere o controle para a fiscalização posterior; C usa alertas automáticos e CAR analisado.'],
      ]),
      h2('Síntese da comparação'),
      txt('O cenário C preserva o ganho econômico da simplificação com perda ambiental menor que B. Pelas premissas adotadas, B cruza o limiar da H1 já em 2026; a confirmação depende do RAD de 2026. A comparação reforça a recomendação 1 do parecer técnico.'),
      h1('Fontes'),
      item(`Lei nº 15.190/2025: Câmara dos Deputados, Legin, texto atualizado (${URL_LEI}), acesso em 30/10/2026.`),
      item('Resolução CONAMA nº 237/1997: PDF oficial do CONAMA; Lei nº 6.938/1981: normas.leg.br, compilação vigente.'),
      item('Partes B e C: MapBiomas, RAD 2023 a 2025; SFB/Sicar (dez/2025), via Portal DBO; cenários por premissa do autor.'),
      p([t('Em caso de diferença entre este quadro e as fontes oficiais, valem as fontes oficiais.', { size: 16, color: DICA })], { spacing: { before: 160 } }),
    ],
  }],
})

;(async () => {
  fs.writeFileSync(path.join(SAIDA, 'exemplo-parecer-tecnico-lei-15190.docx'), await Packer.toBuffer(pareceres))
  fs.writeFileSync(path.join(SAIDA, 'exemplo-quadro-comparativo-lei-15190.docx'), await Packer.toBuffer(quadroEx))
  console.log('ok')
})()
