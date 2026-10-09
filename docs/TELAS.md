# Telas e funcionalidades — Observatório Ambiental

> Especificação funcional. O rascunho visual da **visão do leitor** está em `prototipo/index.html`.
> Prioridade atual: **Parte A (site público)**. A Parte B (painel) fica registrada para uma etapa posterior.
> Fase indicada entre colchetes: **[F1]** MVP, **[F2]** Radar, **[F3]** Alertas, **[F5]** Regional.

---

# Parte A — Site público

## A1. Home

**Objetivo:** levar o visitante ao que interessa em um clique e mostrar o que está prestes a ser votado.

| Bloco | Funcionalidade | Fase |
|---|---|---|
| Cabeçalho | Logo, menu (Proposições, Temas, Regiões, Parlamentares, Sobre/Metodologia), botão **Receber alertas** | F1 |
| Busca principal | Campo único: termo, número do PL, palavra-chave, parlamentar; filtros rápidos por **casa**, **status**, **tema**, **região/UF** | F1 |
| Em pauta esta semana | Faixa com as proposições ambientais que entram em votação nos próximos dias (data, órgão, tags) | F2 |
| Pareceres recentes | Cards dos últimos pareceres publicados | F1 |
| Temas | Grade de categorias (licenciamento, florestas, água, clima, mineração, agrotóxicos, fauna, UCs, saneamento, povos e comunidades) | F1 |
| Regiões | Mapa ou lista das 5 regiões com contagem de proposições monitoradas | F1 (tags) / F5 (fontes estaduais) |
| Chamada de cadastro | "Notas técnicas e quadros comparativos grátis para inscritos" | F1 |
| Rodapé | Metodologia, política de privacidade, termos, contato | F1 |

## A2. Listagem e resultados de busca

| Elemento | Funcionalidade | Fase |
|---|---|---|
| Barra de filtros | Casa, tipo, status, tema, região, UF, impacto, caráter, **com parecer / sem parecer**, período | F1 |
| Ordenação | Relevância, mais recentes, próximos da votação | F1 / F2 |
| Card da proposição | Número e data; **badge de status** colorido; ementa (2 linhas); tags de impacto e caráter; autor (partido-UF); selo "Parecer disponível"; botão **Ver detalhes** | F1 |
| Paginação | Numerada, com URL própria por página (SEO) | F1 |
| Busca textual | No título, ementa e texto integral, em português (radicais, acentos) | F1 |

**Status simplificados (badges):** Apresentada · Em comissão · Em pauta · Urgência · Aprovada na Câmara · Aprovada no Senado · Aguardando sanção · Sancionada (Lei) · Vetada · Arquivada.

## A3. Página da proposição

| Bloco | Conteúdo | Acesso | Fase |
|---|---|---|---|
| Cabeçalho | Tipo, número/ano, casa, data de apresentação, badge de status, regime (urgência) | Público | F1 |
| Ementa e Art. 1º | Transcrição do Art. 1º e objetivos | Público | F1 |
| Tags | Impacto (Alto/Médio/Baixo), caráter (Benéfico/Neutro/Maléfico), temas, biomas, regiões | Público | F1 |
| Linha do tempo | Tramitação resumida, com destaque para a próxima etapa | Público | F1 (manual) / F2 (automática) |
| Atores | Autor(es), relator atual, resultado das votações | Público | F2 |
| Resumo do parecer | Em linguagem simples: o que muda, quem é afetado, quando vota | Público | F1 |
| Conclusão | Posição do parecer em 1–2 parágrafos | Público | F1 |
| Parecer técnico | Resumo rápido (o que muda, quem é afetado, próximo passo), análise e conclusão | Público | F1 |
| Posicionamentos | Mapa de votos por parlamentar, partido e UF; orientações de bancada | Público | F2 |
| Emendas e ênfases | Quem apresentou o quê; eixos e argumentos centrais | Público | F2 |
| Texto integral | Texto oficial (*ipsis litteris*) com link para a fonte e versões | Público | F1 |
| Material completo | **Nota Técnica** e **Quadro comparativo** (lei vigente × proposta) em PDF | **Inscritos** | F1 |
| Acompanhar | Botão "Seguir esta proposição" (alertas por e-mail) | Cadastro | F3 |

**Comportamento para o visitante:** lê a lei e o parecer inteiros; os materiais aparecem com cadeado e o botão **"Liberar materiais"** abre a inscrição.

## A4. Cadastro (modal e página)

| Campo | Obrigatório |
|---|---|
| Nome | Sim |
| E-mail | Sim |
| Perfil (advogado, estudante, servidor público, empresa, ONG/movimento, pesquisador, jornalista, cidadão) | Sim |
| UF | Sim |
| Temas de interesse | Não (pode completar depois) |
| Consentimento para tratamento de dados (LGPD) | Sim |
| Receber newsletter (nacional / da minha região) | Não |

**Fluxo:** envio → e-mail de confirmação → clique → download dos materiais liberado. Acessos seguintes por **link mágico**, sem senha.

## A5. Área do assinante

Proposições seguidas, temas e regiões assinados, preferências de e-mail, histórico de downloads, exportar e excluir meus dados. **[F3]**

## A6. Página de parlamentar **[F3]**

Foto, partido, UF, casa; proposições ambientais de autoria; relatorias; votações em matérias ambientais; botão seguir.

## A7. Página de tema e de região **[F1 / F5]**

Texto introdutório do tema ou da região, proposições em pauta, pareceres, filtros; assinatura da newsletter regional.

## A8. Metodologia

Critérios das tags de impacto e caráter, modelo do parecer, fontes, política de correção, aviso de opinião pessoal do autor. **[F1]**

## A9. Timeline **[F1 manual / F2 automática]**

| Elemento | Funcionalidade |
|---|---|
| Próximas votações | 3 cartões com data, lei e órgão |
| Filtros | Tudo · Pareceres · Votações · Leis sancionadas · **Seguindo** e **Meu estado** (só para inscritos; para visitantes abrem a inscrição) |
| Feed | Agrupado por dia; cada acontecimento tem tipo (parecer publicado, entrou em pauta, votação, texto alterado, virou lei, veto), estado, número, título e uma linha de explicação |
| Ações por item | Ler parecer / Ver lei · **Seguir** (alerta por e-mail) · **Compartilhar** |

## A10. Cabeçalho do inscrito

- Menu: Leis · Timeline · Seguindo (com contador).
- **Avatar** discreto com as iniciais; ao clicar abre um menu com nome e e-mail, leis que sigo, meu estado (troca rápida), temas, chaves de aviso por e-mail (alertas de tramitação, resumo semanal) e Sair.
- Visitante vê "Entrar" (link de acesso por e-mail, sem senha) e "Se inscreva grátis".

## A11. Compartilhar e citar

Disponível na página da lei (botão), em cada item da Timeline e no fim do parecer (bloco fixo).

| Aba | Conteúdo |
|---|---|
| WhatsApp | Título em negrito, número, estado, status, tags e link |
| LinkedIn | Texto profissional com o que muda, a avaliação e hashtags |
| X | Versão curta com contador de caracteres (≤ 280) |
| Instagram | Card quadrado 1080 × 1080 gerado com título, tags e número |
| Citação acadêmica | **ABNT (NBR 6023)**, **APA 7** e **BibTeX**, com data de acesso automática |

## A12. Opinião (vitrine dos pareceres)

| Elemento | Funcionalidade |
|---|---|
| Placar | Total de pareceres e barra Benéficos / Neutros / Maléficos; tocar numa cor filtra a lista |
| Mais recente | Destaque do último parecer com impacto, caráter e situação |
| Lista | Data, título, estado, tags, número e tempo de leitura; filtros Benéficos, Maléficos, Alto impacto, Federais, Estaduais |

## A13. Artigos

| Elemento | Funcionalidade |
|---|---|
| Destaque | Artigo principal com capa, categoria, autor, data e tempo de leitura |
| Categorias | Tendências · Explicadores · Dados (cada uma com uma capa gráfica própria) |
| Grade | Cards com capa, título, linha fina, data e tempo de leitura |
| Chamada | "Um artigo por semana no seu e-mail" para visitantes |

## A14. Leitura de artigo

Barra de progresso de leitura, categoria, título, linha fina, autor; texto com intertítulos, citação em destaque e gráfico simples; **Leis citadas** (com status, levam à página da lei); **Compartilhar e citar** (mesmas abas do parecer, com textos próprios de artigo); **Leia também**.

---

# Parte B — Painel administrativo (etapa posterior)

Menu lateral: **Radar · Triagem · Proposições · Pareceres · Calendário · Palavras-chave · Fontes · Assinantes · Métricas · Configurações**.

## B1. Radar (tela inicial) **[F2]**

| Bloco | Conteúdo |
|---|---|
| Indicadores do dia | Capturadas hoje · Na triagem · Entraram em pauta · Ganharam urgência · Mudaram de status (com parecer) |
| Votações dos próximos 7 dias | Lista por data: proposição, órgão (plenário/comissão), tem parecer? botão **Escrever parecer** |
| Alertas | Eventos relevantes das proposições ativas: substitutivo apresentado, parecer do relator, votação, sanção, veto — cada um com botão "Atualizar parecer" |
| Pareceres da semana | Progresso da meta (ex.: 4 de 6) |
| Saúde das fontes | Última coleta por conector, erros |

## B2. Triagem **[F2]**

| Elemento | Funcionalidade |
|---|---|
| Lista | Fonte, número, ementa, data, **nota de relevância (0–100)**, palavras-chave encontradas (destacadas), eixos e regiões sugeridos, resumo da IA em 2 linhas |
| Filtros | Fonte, casa, esfera, região/UF, faixa de relevância, eixo |
| Ações por item | **Ativar** (gera dossiê e rascunho), **Monitorar** (acompanha sem parecer), **Descartar** (com motivo, usado para calibrar a IA) |
| Ações em lote | Monitorar ou descartar vários |

## B3. Ficha da proposição (painel) **[F1 / F2]**

Abas:

1. **Dados** — campos da proposição (editáveis; origem API ou manual).
2. **Texto e versões** — texto integral, versões, **comparação entre versões**.
3. **Tramitação** — linha do tempo completa.
4. **Atores e posicionamentos** — autores, relatores, emendas, votações e votos, orientações de bancada, ênfases (confirmar/ajustar as da IA).
5. **Legislação afetada** — leis e artigos alterados, com o texto vigente.
6. **Parecer** — atalho para o editor.

Cadastro manual: mesmo formulário, com upload do PDF do texto (extração automática). **[F1]**

## B4. Editor do parecer **[F1, IA na F2]**

| Elemento | Funcionalidade |
|---|---|
| Layout | **Tela dividida**: texto da lei à esquerda (com marcação de trechos), parecer à direita |
| Gerar rascunho IA | Preenche os blocos do modelo padrão a partir do dossiê **[F2]** |
| Blocos | Resumo simples · Contexto e tramitação · Análise artigo por artigo · Tabela comparativa · Gráfico · Votos · Emendas · Constitucionalidade · Conclusão · Texto livre |
| Materiais | Upload ou geração da Nota Técnica e do Quadro comparativo, com chave **Público / Inscritos** (padrão: inscritos) |
| Inserir dados | Botões para inserir blocos prontos com dados capturados (tabela de votos, lista de emendas, linha do tempo) |
| Tags | Impacto, caráter, temas, biomas, regiões (sugestões da IA aceitáveis com um clique) |
| Vincular trecho | Selecionar trecho da lei e anexar comentário do parecer |
| Pré-visualizar | Como **Visitante** / como **Assinante** / **PDF** |
| Status | Rascunho IA → Em revisão → Revisado → Agendado → Publicado |
| Versões | Histórico do parecer; nova versão quando o texto-base muda, com data de referência |
| Publicar | Publicar agora ou agendar; gera o PDF; dispara alertas para seguidores **[F3]** |

## B5. Calendário editorial **[F1]**

Visão semanal: pareceres agendados e publicados sobrepostos às **datas de votação** do Radar; meta semanal (3–10).

## B6. Palavras-chave **[F2]**

Dicionário editável: termo, grupo/eixo, **peso**, escopo (nacional ou região), **exclusão**; teste em tempo real ("quantas proposições dos últimos 30 dias este termo captura").

## B7. Fontes **[F2 / F4]**

Lista de conectores: jurisdição, nível A–D, frequência, última coleta, itens capturados, erros; botão "coletar agora"; ativar/desativar.

## B8. Assinantes **[F1]**

Lista com nome, e-mail, perfil, UF, data, **parecer de origem**, consentimentos; filtros; exportação CSV; atender pedidos de exclusão (LGPD).

## B9. Métricas **[F1]**

Por parecer: visitas, leitura até o fim, cliques em "Liberar materiais", **taxa de conversão em cadastro**, downloads dos PDFs. Geral: crescimento de assinantes, perfis, UFs, origem do tráfego, termos mais buscados no site.

## B10. Configurações

Usuários e papéis (autor, revisor, administrador), modelo padrão do parecer, textos legais, e-mails automáticos, integrações.
