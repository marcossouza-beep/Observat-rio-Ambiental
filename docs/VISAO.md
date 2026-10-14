# Visão do produto — Observatório Ambiental

> Documento vivo. Registra as decisões tomadas até aqui. Nome definitivo do produto: **pendente** (nome de trabalho: *Observatório Ambiental*).

## O que é

Um **observatório sistemático** da legislação ambiental brasileira. O portal monitora projetos de lei e normas em tramitação ou recém-aprovadas, captura automaticamente o texto oficial e publica **pareceres técnico-jurídicos** que traduzem o "juridiquês" das casas legislativas em informação acionável — **antes** que a matéria seja votada ou vire lei.

## Decisões consolidadas

| Tema | Decisão |
|---|---|
| Natureza | Projeto pessoal |
| Formato | Observatório sistemático (monitoramento contínuo + curadoria) |
| Público | A coletividade (cidadão, profissionais, academia, setor produtivo, sociedade civil) |
| Modelo | **Freemium**: parecer aberto a todos; Nota Técnica e Quadro comparativo (PDF) para inscritos; camada paga a definir depois de medir a demanda |
| Produção | 3 a 10 pareceres por semana, guiados pelo que vai a votação |
| Nome da análise | **Parecer** |
| Autoria | Autor único no início, com estrutura pronta para colaboradores |
| Escopo inicial | Federal: Câmara, Senado, Congresso (vetos) e Casa Civil/Presidência (sanções, vetos, DOU) |
| Expansão | Monitoramento **regional**, região por região (Norte, Nordeste, Centro-Oeste, Sudeste, Sul), com a mesma lógica |

## Diferencial

A coexistência, na mesma página, de:

1. **Texto bruto da lei** (vindo da API oficial, *ipsis litteris*);
2. **Dados de tramitação e atores** (autoria, relatoria, emendas, votações, posicionamentos);
3. **Curadoria técnica** (parecer com tags de impacto e caráter).

## Camadas de acesso (freemium)

| Camada | Acesso | Conteúdo |
|---|---|---|
| Pública | Sem cadastro | Ficha da proposição (número, data, status, ementa, Art. 1º), texto integral, autor/relator, resultado de votações, tags e o **parecer técnico completo** |
| Cadastro gratuito | Nome, e-mail, perfil, UF + consentimento | **Materiais em PDF**: Nota Técnica e Quadro comparativo (lei vigente × proposta); alertas de tramitação; newsletter (nacional ou regional) |
| Premium (futuro) | Pago | A definir com base nas métricas |

## Classificação dos pareceres

| Campo | Valores |
|---|---|
| Impacto | Alto · Médio · Baixo |
| Caráter | **Maléfico** (enfraquece diretamente) · **Enfraquece indiretamente** · Neutro · **Benéfico** (fortalece a proteção) |

**Áreas avaliadas:** licenciamento, florestas, água, clima, mineração, agrotóxicos, **espécies exóticas** (introdução, cultivo e controle de espécies exóticas e invasoras, como na aquicultura), unidades de conservação, povos e comunidades, fauna e saneamento.

"Enfraquece indiretamente": a proposta não muda a proteção de forma direta, mas abre caminho para o dano (corta fiscalização ou orçamento, amplia prazos, cria exceções que dependem de regulamento).

## Públicos com recursos próprios

- **Imprensa credenciada:** jornalistas verificados (veículo, função, comprovação) recebem pareceres sob embargo, contato com o autor, gráficos e dados.

## Princípios de produto

- **A pauta de votação define a pauta editorial.** O radar mostra o que entra em pauta, ganha urgência, recebe substitutivo, é votado, sancionado ou vetado.
- **Fato x interpretação.** Dados (autoria, votos, status) são capturados e exibidos pelo sistema; a interpretação está no parecer.
- **O parecer é do autor, nunca da IA.** A automação (incluindo IA) apenas captura pelas APIs os dados e textos oficiais, organiza o dossiê e entrega ao autor. A análise, a comparação de versões, a classificação e a redação do parecer são feitas integralmente pelo autor indicado, que assina.
- **Só prometer o que se cumpre.** Todo dado automático mostra a data; toda promessa com prazo vira compromisso cobrado no painel; parecer de texto que mudou é marcado na hora. Detalhes em `docs/ENTREGA.md`.
- **UX didática.** Layout simples, dinâmico, com tags coloridas e leitura guiada.
- **SEO desde o início.** Parte pública indexável; páginas por proposição, parecer, parlamentar, tema, bioma, estado e autor; autoria visível em todo parecer. Plano completo em `docs/SEO.md`.

## Itens pendentes

- Nome e marca definitivos.
- Escolha da região-piloto para o monitoramento regional (sugestão: Norte).
- Definição da camada premium (após Fase 3).
