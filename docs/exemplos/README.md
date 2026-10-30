# Exemplo didático: Lei nº 15.190/2025 (Lei Geral do Licenciamento Ambiental)

Preenchimento completo dos modelos (`docs/modelos/`) com uma lei real, para servir de referência. **Não é parecer publicado nem assinado**: num parecer real, a análise, a classificação e a assinatura são do autor.

| Arquivo | O que mostra |
|---|---|
| `exemplo-parecer-tecnico-lei-15190.docx` | Parecer técnico nº 001/2026 (exemplo): ficha, texto base literal, regime anterior × novo, síntese, cotejo, problema, hipóteses H1 a H3, impactos, cenários, soluções, casos de referência, conclusão e Anexo I com a íntegra dos arts. 9º e 22. |
| `exemplo-quadro-comparativo-lei-15190.docx` | A. cotejo literal (CONAMA 237/1997 e Lei 6.938/1981 × Lei 15.190/2025); B. testagem das hipóteses; C. gráficos de trajetória (observado 2022-2025 + cenários) e de potencialidades. |
| `exemplo-planilha-lei-15190.xlsx` | A planilha de hipóteses e gráficos preenchida com os mesmos dados. |

**Recorte:** art. 9º (não sujeição de atividades agropecuárias) e art. 22 (licença por adesão e compromisso), no texto atualizado com os vetos derrubados (DOU de 8/12/2025) e a Lei nº 15.300/2025.

## Fontes (conferidas em 30/10/2026)

- Lei nº 15.190/2025, texto atualizado: Câmara dos Deputados, Legin. Cópia gravada em `web/tests/fixtures/coleta/referencias/camara-15190-atualizada.json`.
- Resolução CONAMA nº 237/1997: PDF oficial do CONAMA, gravado em `web/tests/fixtures/coleta/referencias/conama-237.pdf`.
- Lei nº 6.938/1981, art. 10: compilação vigente do normas.leg.br (`web/tests/fixtures/coleta/normas/normas-leg-6938-vigente.json`).
- MapBiomas, RAD 2023, 2024 e 2025 (área desmatada: 2.069.695 ha em 2022, 1.829.597 ha em 2023, 1.242.079 ha em 2024, 984.794 ha em 2025; mais de 97% com vetor agropecuário de 2019 a 2024).
- Serviço Florestal Brasileiro, Sicar, dez/2025, via Portal DBO (8.154.567 cadastros; 480.700 análises concluídas, 5,9%).
- INPE/PRODES via Climate Policy Initiative; Gibbs et al. (2015), *Brazil's Soy Moratorium*, Science 347(6220).
- STF: ADIs 7.913, 7.916 e 7.919 e ADC 102 (julgamento adiado, Rádio Senado, 26/8/2026).

**Cenários de 2026 a 2030 são trajetórias por premissa, não previsões** (A: −10% ao ano; B: +5% ao ano; C: −5% ao ano, a partir de 2025). Servem para tornar a H1 testável; o RAD de 2026 sai em maio de 2027.

## Gerar de novo

```bash
node gerador/desenhar.mjs gerador/dados-lei-15190.json gerador
node gerador/exemplo.js . ../../web/public/marca/logo.png gerador
python3 ../modelos/gerador/planilha.py gerador/dados-lei-15190.json exemplo-planilha-lei-15190.xlsx
```
