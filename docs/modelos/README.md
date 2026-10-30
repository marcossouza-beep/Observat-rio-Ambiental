# Modelos e metodologia padrão de análise

| Arquivo | O que é |
|---|---|
| `guia-metodologia.docx` | Metodologia padrão de análise (versão 1.0): produtos e como se ligam, etapas e prazos, leitura do texto, classificação, cotejo, hipóteses, testagem e confiança, cenários e potencialidades, regras dos gráficos, fontes, fundamentos e checklist. |
| `modelo-nota-tecnica.docx` | Nota técnica (o parecer completo): ficha, texto base (com o texto normativo alterado), síntese, descrição, leitura do cotejo, problema, hipóteses, impactos, cenários, soluções, casos, conclusão com o resultado de cada hipótese, referências e limitações; Anexo I com a íntegra. |
| `modelo-quadro-comparativo.docx` | Quadro comparativo em três partes: A. cotejo literal dos textos; B. testagem das hipóteses; C. comparação de potencialidades entre os cenários, com os gráficos 1 (trajetória com limiar) e 2 (potencialidades por dimensão). |
| `planilha-hipoteses-e-graficos.xlsx` | Ferramenta do autor: hipóteses com critério de resultado sugerido (o resultado final é do autor), cenários A/B/C por ano com o limiar da H1, potencialidades de −2 a +2; os gráficos do Excel se atualizam sozinhos e usam as cores padrão. |

Os valores e gráficos já preenchidos são **exemplo ilustrativo com dados fictícios** (PL do licenciamento simplificado). Dado fictício nunca é publicado.

Cores fixas dos cenários: A `#2A78D6` (azul), B `#EB6834` (laranja), C `#1BAF7A` (verde-água); limiar `#8A8984`. As três primeiras cores da paleta categórica validada para daltonismo (todas as combinações de pares); o verde-água fica abaixo de 3:1 de contraste, por isso todo gráfico leva rótulo de valor e tabela de dados.

## Gerar de novo

Em `gerador/` (precisa de Node com o pacote `docx`, Python com `openpyxl` e o Chromium do Playwright do `web/`):

```bash
node gerador/desenhar.mjs                                   # gráficos de exemplo (PNG) a partir de dados.json
node gerador/modelos.js . ../../web/public/marca/logo.png gerador   # os três .docx
python3 gerador/planilha.py gerador/dados.json planilha-hipoteses-e-graficos.xlsx
```
