# Planilha de testagem de hipóteses e gráficos do quadro comparativo (ênfase jur).
import json, sys
from openpyxl import Workbook
from openpyxl.chart import BarChart, LineChart, Reference
from openpyxl.chart.shapes import GraphicalProperties
from openpyxl.drawing.line import LineProperties
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.comments import Comment

dados = json.load(open(sys.argv[1]))
saida = sys.argv[2]
COR = {'A': '2A78D6', 'B': 'EB6834', 'C': '1BAF7A', 'limiar': '8A8984'}
F = 'Arial'
fonte = lambda **k: Font(name=F, size=k.pop('size', 10), **k)
ENTRADA = PatternFill('solid', fgColor='FFF2A8')   # célula para preencher
CAB = PatternFill('solid', fgColor='EEF6F1')
fina = Side(style='thin', color='D5DDD8')
borda = Border(top=fina, bottom=fina, left=fina, right=fina)
AZUL = '0000FF'

wb = Workbook()

def cabecalho(ws, linha, titulos, larguras=None):
    for j, t in enumerate(titulos, 1):
        c = ws.cell(row=linha, column=j, value=t)
        c.font = fonte(bold=True, color='23864F'); c.fill = CAB; c.border = borda
        c.alignment = Alignment(wrap_text=True, vertical='top')
    if larguras:
        for j, w in enumerate(larguras, 1):
            ws.column_dimensions[ws.cell(row=1, column=j).column_letter].width = w

def entrada(c, valor=None, numero=None):
    if valor is not None: c.value = valor
    c.fill = ENTRADA; c.font = fonte(color=AZUL); c.border = borda
    c.alignment = Alignment(wrap_text=True, vertical='top')
    if numero: c.number_format = numero

def formula(c, f, numero=None):
    c.value = f; c.font = fonte(); c.border = borda
    c.alignment = Alignment(wrap_text=True, vertical='top')
    if numero: c.number_format = numero

# ---------------- Leia-me ----------------
ws = wb.active; ws.title = 'Leia-me'
ws.column_dimensions['A'].width = 110
linhas = [
    ('Planilha de testagem de hipóteses e gráficos do quadro comparativo', dict(bold=True, size=14)),
    ('Metodologia padrão de análise da ênfase jur. Versão do método 1.0.', dict(color='52514E')),
    ('', {}),
    ('Como usar', dict(bold=True, size=11)),
    ('1. Preencha só as células amarelas (texto azul). As demais são fórmulas e se atualizam sozinhas.', {}),
    ('2. Aba Hipóteses: uma linha por hipótese da nota técnica (parte 6). O critério sugere um resultado; o resultado final é sempre do autor (coluna L).', {}),
    ('3. Aba Cenários: valores do indicador da H1 por ano em cada cenário (A, B, C). O gráfico de trajetória e o limiar da H1 se atualizam.', {}),
    ('4. Aba Potencialidades: direção do efeito de B e C em relação a A, de −2 a +2, por dimensão. O gráfico se atualiza.', {}),
    ('5. Copie os gráficos para o quadro comparativo (parte C) e cite, abaixo de cada um, a fonte e o ano dos dados.', {}),
    ('', {}),
    ('Cores dos cenários (as mesmas em todos os gráficos e documentos)', dict(bold=True, size=11)),
    ('Cenário A, referência (a proposta não é aprovada): azul #2A78D6', dict(color=COR['A'], bold=True)),
    ('Cenário B, aprovada como está: laranja #EB6834', dict(color=COR['B'], bold=True)),
    ('Cenário C, aprovada com os ajustes recomendados: verde-água #1BAF7A', dict(color=COR['C'], bold=True)),
    ('Limiar da hipótese: linha cinza #8A8984', dict(color=COR['limiar'], bold=True)),
    ('', {}),
    ('Regras dos gráficos', dict(bold=True, size=11)),
    ('Um eixo só (nunca dois eixos verticais). Valor do rótulo no fim da linha ou da barra. Fonte e ano abaixo de cada gráfico. Sem 3D, sem sombra.', {}),
    ('', {}),
    ('Os valores já preenchidos são um EXEMPLO ILUSTRATIVO COM DADOS FICTÍCIOS (PL do licenciamento simplificado). Substitua pelos dados da análise.', dict(bold=True, color='B23B3B')),
]
for i, (t, f) in enumerate(linhas, 1):
    c = ws.cell(row=i, column=1, value=t); c.font = fonte(**f); c.alignment = Alignment(wrap_text=True)
c = ws.cell(row=len(linhas) + 2, column=1, value='Célula para preencher'); entrada(c)

# ---------------- Hipóteses ----------------
wh = wb.create_sheet('Hipóteses')
tit = ['Nº', 'Hipótese (como na nota técnica)', 'Indicador', 'Unidade', 'Fonte da linha de base', 'Linha de base', 'Sentido esperado', 'Limiar (variação que sustenta a hipótese)', 'Variação observada ou projetada', 'Confiança da evidência', 'Resultado pelo critério', 'Resultado final (autor)', 'Justificativa em 1 linha']
cabecalho(wh, 1, tit, [5, 42, 30, 12, 26, 12, 14, 16, 16, 14, 20, 20, 40])
wh.row_dimensions[1].height = 42
exemplo = [
    ['H1', 'Se aprovada como está, a proposta tende a aumentar a supressão de vegetação nativa em imóveis de médio porte, porque retira a análise prévia.', dados['indicador'], dados['unidade'], 'Exemplo fictício, 2025', 120, 'aumento', 0.10, 0.18, 'baixa', None, 'Sustentada em parte', 'Um só caso de referência estadual (+18% em 3 anos); falta série própria.'],
    ['H2', 'Com os ajustes recomendados (zona de amortecimento e limite de 4 módulos), o aumento fica abaixo da metade do previsto em H1.', dados['indicador'], dados['unidade'], 'Exemplo fictício, 2025', 120, 'aumento', 0.05, None, 'baixa', None, None, 'Sem caso de referência comparável.'],
]
for i in range(2, 8):
    linha = exemplo[i - 2] if i - 2 < len(exemplo) else [f'H{i-1}'] + [None] * 12
    wh.cell(row=i, column=1, value=linha[0]).font = fonte(bold=True)
    for j in range(2, 14):
        if j == 11: continue
        entrada(wh.cell(row=i, column=j), linha[j - 1], '0%' if j in (8, 9) else ('#,##0' if j == 6 else None))
    # Critério (sugestão): sem dado → inconclusiva; atingiu o limiar → sustentada; metade do limiar → em parte; resto → não sustentada
    g, h, i_ = f'G{i}', f'H{i}', f'I{i}'
    j_ = f'J{i}'
    formula(wh.cell(row=i, column=11), f'=IF(OR({h}="",{i_}=""),"Inconclusiva",IF(IF({g}="redução",-{i_},{i_})>=ABS({h}),IF({j_}="baixa","Sustentada em parte","Sustentada"),IF(IF({g}="redução",-{i_},{i_})>=ABS({h})/2,"Sustentada em parte","Não sustentada")))')
    wh.row_dimensions[i].height = 60
dv1 = DataValidation(type='list', formula1='"aumento,redução"', allow_blank=True); wh.add_data_validation(dv1); dv1.add('G2:G7')
dv2 = DataValidation(type='list', formula1='"alta,média,baixa"', allow_blank=True); wh.add_data_validation(dv2); dv2.add('J2:J7')
dv3 = DataValidation(type='list', formula1='"Sustentada,Sustentada em parte,Não sustentada,Inconclusiva"', allow_blank=True); wh.add_data_validation(dv3); dv3.add('L2:L7')
wh['K1'].comment = Comment('Sugestão automática: atingiu o limiar → Sustentada (ou Sustentada em parte, se a confiança é baixa); metade do limiar → Sustentada em parte; abaixo → Não sustentada; sem dado → Inconclusiva. O resultado que vale é o da coluna L, decidido pelo autor.', 'ênfase jur')
wh['H1'].comment = Comment('Em proporção: 10% = 0,10. Para hipótese de redução, informe o limiar como positivo e escolha "redução" no sentido.', 'ênfase jur')
r = 9
for t in ['Critérios', 'Sustentada: o indicador atinge o limiar no sentido esperado, com evidência de confiança alta ou média.', 'Sustentada em parte: atinge ao menos metade do limiar, ou atinge o limiar só com evidência de confiança baixa.', 'Não sustentada: fica abaixo da metade do limiar ou vai no sentido contrário.', 'Inconclusiva: não há dado ou caso comparável suficiente. Diga o que faltou.']:
    c = wh.cell(row=r, column=2, value=t); c.font = fonte(bold=(r == 9)); r += 1
wh.freeze_panes = 'C2'

# ---------------- Cenários ----------------
wc = wb.create_sheet('Cenários')
wc['A1'] = 'Indicador da H1'; wc['A1'].font = fonte(bold=True)
entrada(wc['B1'], f"{dados['indicador']} ({dados['unidade']})")
wc['A2'] = 'Limiar da H1 (variação)'; wc['A2'].font = fonte(bold=True)
formula(wc['B2'], "='Hipóteses'!H2", '0%')
cabecalho(wc, 4, ['Ano'] + [c['nome'] for c in dados['cenarios']] + ['Limiar da H1', 'Variação de B sobre o ano base', 'Variação de C sobre o ano base'], [34, 24, 24, 24, 16, 18, 18])
wc.row_dimensions[4].height = 30
for i, ano in enumerate(dados['anos']):
    r = 5 + i
    entrada(wc.cell(row=r, column=1), ano)
    for j, c in enumerate(dados['cenarios']):
        entrada(wc.cell(row=r, column=2 + j), c['valores'][i], '#,##0')
    formula(wc.cell(row=r, column=5), '=$B$5*(1+$B$2)', '#,##0')
    formula(wc.cell(row=r, column=6), f'=IF($C$5=0,"",C{r}/$C$5-1)', '0%')
    formula(wc.cell(row=r, column=7), f'=IF($D$5=0,"",D{r}/$D$5-1)', '0%')
fim = 4 + len(dados['anos'])
wc.cell(row=fim + 2, column=1, value='Fonte e premissas:').font = fonte(bold=True)
entrada(wc.cell(row=fim + 2, column=2), 'Exemplo fictício. Informe fonte, ano e premissas de cada cenário.')
wc.merge_cells(start_row=fim + 2, start_column=2, end_row=fim + 2, end_column=7)

lc = LineChart()
lc.title = None; lc.height = 9; lc.width = 22
lc.y_axis.title = dados['unidade']; lc.x_axis.title = None
lc.y_axis.majorGridlines.spPr = GraphicalProperties(ln=LineProperties(solidFill='E6E5E0', w=6350))
dados_ref = Reference(wc, min_col=2, max_col=5, min_row=4, max_row=fim)
lc.add_data(dados_ref, titles_from_data=True)
lc.set_categories(Reference(wc, min_col=1, min_row=5, max_row=fim))
for s, k in zip(lc.series, ['A', 'B', 'C', 'limiar']):
    s.graphicalProperties.line.solidFill = COR[k]
    s.graphicalProperties.line.width = 19050 if k != 'limiar' else 12700
    s.smooth = False
    if k != 'limiar':
        s.marker.symbol = 'circle'; s.marker.size = 6
        s.marker.graphicalProperties = GraphicalProperties(solidFill=COR[k], ln=LineProperties(solidFill='FCFCFB'))
    else:
        s.marker.symbol = 'none'
lc.legend.position = 'b'
lc.x_axis.delete = False; lc.y_axis.delete = False
wc.add_chart(lc, 'A' + str(fim + 4))

# ---------------- Potencialidades ----------------
wp = wb.create_sheet('Potencialidades')
cabecalho(wp, 1, ['Dimensão', 'B. Aprovada como está', 'C. Aprovada com ajustes', 'Por que (1 linha)'], [26, 22, 22, 60])
wp.row_dimensions[1].height = 30
for i, dim in enumerate(dados['dimensoes']):
    r = 2 + i
    entrada(wp.cell(row=r, column=1), dim)
    entrada(wp.cell(row=r, column=2), dados['potencial']['B'][i], '+0;-0;0')
    entrada(wp.cell(row=r, column=3), dados['potencial']['C'][i], '+0;-0;0')
    entrada(wp.cell(row=r, column=4), None)
dv4 = DataValidation(type='whole', operator='between', formula1='-2', formula2='2', showErrorMessage=True, error='Use um inteiro de −2 a +2.')
wp.add_data_validation(dv4); dv4.add('B2:C5')
r = 2 + len(dados['dimensoes']) + 1
for t in ['Escala (sempre em relação ao cenário A, a referência)', '−2 piora muito · −1 piora · 0 sem mudança · +1 melhora · +2 melhora muito', 'Dimensões fixas: ambiental, social, econômica, institucional e fiscal (as mesmas da nota técnica, parte 7).']:
    c = wp.cell(row=r, column=1, value=t); c.font = fonte(bold=t.startswith('Escala')); r += 1

bc = BarChart(); bc.type = 'bar'; bc.grouping = 'clustered'
bc.height = 9; bc.width = 22; bc.title = None
bc.add_data(Reference(wp, min_col=2, max_col=3, min_row=1, max_row=1 + len(dados['dimensoes'])), titles_from_data=True)
bc.set_categories(Reference(wp, min_col=1, min_row=2, max_row=1 + len(dados['dimensoes'])))
for s, k in zip(bc.series, ['B', 'C']):
    s.graphicalProperties = GraphicalProperties(solidFill=COR[k], ln=LineProperties(noFill=True))
bc.x_axis.scaling.orientation = 'maxMin'   # dimensões de cima para baixo, na ordem da tabela
bc.y_axis.scaling.min = -2; bc.y_axis.scaling.max = 2; bc.y_axis.majorUnit = 1
bc.y_axis.title = '← piora · melhora → (em relação ao cenário A)'
bc.y_axis.majorGridlines.spPr = GraphicalProperties(ln=LineProperties(solidFill='E6E5E0', w=6350))
bc.gapWidth = 60; bc.overlap = -5
bc.legend.position = 'b'
bc.x_axis.tickLblPos = 'low'   # nomes das dimensões na borda esquerda, fora das barras
bc.x_axis.delete = False; bc.y_axis.delete = False
wp.add_chart(bc, 'A' + str(r + 1))

for w in wb.worksheets:
    w.page_setup.orientation = 'landscape'
    w.page_setup.fitToWidth = 1
    w.page_setup.fitToHeight = 0
    w.sheet_properties.pageSetUpPr.fitToPage = True
wb.save(saida)
print('ok')
