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
| Temas | Grade de categorias (licenciamento, florestas, água, clima, mineração, agrotóxicos, **espécies exóticas**, fauna, UCs, saneamento, povos e comunidades) | F1 |
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

Acesso pelos cartões de autor e relator, pelos autores de emendas e pela lista "Parlamentares" em Leis federais.

| Bloco | Conteúdo |
|---|---|
| Cabeçalho | Retrato (ou iniciais) com bandeira do estado, cargo e casa, nome, partido, estado, mandato; botão Seguir |
| Em números | Propostas ambientais de autoria, relatorias, emendas, presença em votações ambientais |
| Comissões | Comissões em que atua (titular, suplente, presidente) |
| Como votou | Resumo ("em N votações sobre propostas com parecer, votou no sentido da proteção em X"), barra contra / ausente / a favor, lista de votos com caráter da proposta, voto (Sim, Não, Ausente) e sentido |
| Autorias | Padrão das propostas de autoria (barra de caráter e tendência) e lista |
| Relatorias e Emendas | Listas com link para a lei |
| Método | Voto "Sim" em proposta benéfica, ou "Não" em proposta maléfica ou que enfraquece indiretamente, conta como a favor da proteção; propostas neutras ficam fora; mostra o sentido dos votos, não avalia a pessoa |

## A3b. Autoria no parecer e no artigo

- **Só no topo, discreta:** foto pequena, "Por Nome do Autor" (link para a página do autor), ícones pequenos das redes (LinkedIn, Instagram, X, Currículo Lattes, e-mail) e título profissional. Sem quadro de autor no fim da página.
- **Assuntos:** temas, biomas e esfera (federal/estado) como links internos, no fim do parecer.
- **Trilha de navegação** no topo: Início › Leis federais › PL › Parecer.
- **Página do autor** (acessada pelo nome): foto, título, biografia, redes, números e listas de pareceres e artigos.

## A6b. Deputados estaduais

| Elemento | Conteúdo |
|---|---|
| Seleção de estado | Botões com bandeira dos estados monitorados (padrão: estado do inscrito ou o selecionado em Leis estaduais) |
| Cabeçalho | Sigla da Assembleia, total de deputados e quantos têm atuação ambiental monitorada |
| Busca | Por nome ou partido |
| Lista | Deputados com autoria, relatoria ou emenda em propostas monitoradas, com barra do caráter das autorias; os demais ficam recolhidos em "Outros N deputados" |
| Nota de fonte | Lista vem do TSE (uma vez por legislatura); autorias vêm das propostas monitoradas; votos individuais não são mostrados |
| Perfil estadual | Versão leve da página de parlamentar: sem "Como votou", presença e comissões; números (autorias monitoradas, relatorias, emendas, com parecer), aviso de que a Assembleia não publica votos nominais em formato aberto, abas Autorias, Relatorias e Emendas |

## A7. Página de tema e de região **[F1 / F5]**

Texto introdutório do tema ou da região, proposições em pauta, pareceres, filtros; assinatura da newsletter regional.

## A8. Metodologia **[F1]**

Página de transparência, com sumário fixo e versão do método (ex.: 1.0) e data de atualização.

| Seção | Conteúdo |
|---|---|
| 1. Do projeto ao parecer | Monitoramento (automático) → Triagem (automático + pessoa) → Análise (pessoa) → Parecer (pessoa, modelo fixo) → Publicação e atualização (versões) |
| 2. Como classificamos | Caráter em 4 categorias com definição e exemplo real do site ao tocar; tabela de critérios de impacto (alto, médio, baixo); regra de desempate (usa o nível mais alto e explica) |
| 3. Indicadores | Padrão de atuação, tendência (fórmula e limites de ±15), amostra mínima (5), sentido do voto federal, biomas e áreas (contagem múltipla), estados sem votos |
| 4. Fontes | Tabela fonte · o que usamos · frequência; vale sempre a fonte oficial |
| 5. Automação e IA | A automação só captura e organiza dados e textos oficiais; nunca escreve, resume, compara ou interpreta; todo parecer é escrito e assinado pelo autor |
| 6. Independência e limites | Projeto pessoal, não é consultoria nem peça processual, sem patrocínio de interessados, avalia propostas e não pessoas |
| 7. Correções | Formulário de pedido de correção e registro público das correções |
| 8. Perguntas frequentes | Respostas curtas e expansíveis |

Acesso: rodapé (Metodologia, Correções, Independência), notas de método do Panorama e do padrão de atuação, e o link "como classificamos" no veredito do parecer.

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

## A15. Leis estaduais

| Elemento | Funcionalidade |
|---|---|
| Mapa do Brasil em blocos | Um bloco por estado, na posição aproximada; cor indica quantas leis estão em destaque; listrado = "em breve" (estado ainda fora do monitoramento) |
| Atalhos por região | Norte, Nordeste, Centro-Oeste, Sudeste, Sul destacam os estados da região |
| Painel do estado | Região, nome, Assembleia; em tramitação, aprovadas, com parecer; tipo de cobertura (automática, manual, em breve); lista de leis; "Acompanhar estado" ou "Avise-me" |
| Padrão | Para o inscrito, abre no estado cadastrado |

## A16. Leis federais

| Elemento | Funcionalidade |
|---|---|
| Casa | Todas · Câmara · Senado · Presidência |
| Onde estão os projetos | Etapas Apresentado → Comissões → Plenário → Outra casa → Virou norma, com contagem; tocar filtra a lista |
| Esta semana no Congresso | Votações dos próximos dias com data e órgão |
| Lista | Casa, status, impacto, caráter, número e etapa |

## A17. Inscrição no celular

Fluxo próprio para telas pequenas (no computador, a página `#inscricao-celular` mostra o mesmo fluxo dentro de uma moldura de celular).

| Elemento | Decisão |
|---|---|
| Topo | Voltar/fechar, barra de progresso e contador (ex.: 3/5) |
| Passos | Você → Perfil → **Imprensa** (só jornalistas) → Interesses (estado com bandeira, temas, **biomas**) → Avisos |
| Botão principal | Fixo embaixo, ao alcance do polegar |
| Benefícios | Carrossel horizontal no primeiro passo |
| Perfil | Cartões grandes de toque (escolha única) |
| Campos | 16px (sem zoom), teclado certo por tipo (e-mail, URL), preenchimento automático |
| Final | "Confira seu e-mail"; para jornalistas, cartão "Credenciamento em análise" |

## A18. Credenciamento de imprensa

Passo extra quando o perfil é Jornalista: o que o credenciamento libera; veículo*, tipo de veículo, função, link de comprovação*, e-mail profissional, registro MTb, autorização de verificação*. Depois: selo no avatar, status no menu ("Em análise" / "✓ Verificada") e bloco **Para a imprensa** no parecer (pedir entrevista, gráficos PNG, dados CSV). Visitantes veem "É jornalista? Faça o credenciamento".

## A19. Padrão de atuação (em Leis federais e no painel de cada estado)

Barras 100% com Maléfico · Enfraquece indiretamente · Neutro · Benéfico, em duas linhas (tudo que tramitou / só o que foi aprovado), tendência (tende a proteger / equilibrada / tende a enfraquecer / amostra pequena), temas mais frequentes e nota de método. Em Leis federais acompanha o filtro de casa (Todas = União).

## A20. Panorama

| Aba | Conteúdo |
|---|---|
| Casas e estados | Ranking com bandeira, nº de pareceres, barra de caráter e tendência; alterna "tudo que tramitou / só aprovadas"; tocar leva à página da casa ou do estado |
| Biomas | Cartão por bioma (pareceres, propostas, barra, % alto impacto); detalhe com principais pressões e avanços, temas e leis do bioma |
| Áreas | Linha por área com quantidade (barra) e caráter (barra 100%); tocar abre "O que temos visto" |
| Todas | Legenda única, definição de "enfraquece indiretamente", "Ver como tabela", método e amostra mínima |

---

# Parte B — Painel administrativo (etapa posterior)

Menu lateral: **Radar · Triagem · Proposições · Pareceres · Calendário · Palavras-chave · Fontes · Assinantes · Credenciamento · Métricas · Configurações**.

> **Credenciamento (imprensa):** fila de pedidos com veículo, função, link de comprovação e e-mail; ações Aprovar / Pedir mais informações / Recusar (com motivo); histórico de quem verificou.

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
| Lista | Fonte, número, ementa, data, **nota de relevância (0–100)**, palavras-chave encontradas (destacadas), eixos e regiões pelos termos encontrados, ementa oficial |
| Filtros | Fonte, casa, esfera, região/UF, faixa de relevância, eixo |
| Ações por item | **Ativar** (monta o dossiê para o autor), **Monitorar** (acompanha sem parecer), **Descartar** (com motivo, usado para ajustar o dicionário de palavras-chave) |
| Ações em lote | Monitorar ou descartar vários |

## B3. Ficha da proposição (painel) **[F1 / F2]**

Abas:

1. **Dados** — campos da proposição (editáveis; origem API ou manual).
2. **Texto e versões** — texto integral, versões, **comparação entre versões**.
3. **Tramitação** — linha do tempo completa.
4. **Atores e posicionamentos** — autores, relatores, emendas, votações e votos, orientações de bancada, ênfases (registradas pelo autor).
5. **Legislação afetada** — leis e artigos alterados, com o texto vigente.
6. **Parecer** — atalho para o editor.

Cadastro manual: mesmo formulário, com upload do PDF do texto (extração automática). **[F1]**

## B4. Editor do parecer **[F1]**

| Elemento | Funcionalidade |
|---|---|
| Layout | **Tela dividida**: texto da lei à esquerda (com marcação de trechos), parecer à direita |
| Dossiê ao lado | Texto integral, versões, justificativa, tramitação e legislação afetada para consulta do autor (nada é preenchido automaticamente no parecer) |
| Blocos | Resumo simples · Contexto e tramitação · Análise artigo por artigo · Tabela comparativa · Gráfico · Votos · Emendas · Constitucionalidade · Conclusão · Texto livre |
| Materiais | Upload ou geração da Nota Técnica e do Quadro comparativo, com chave **Público / Inscritos** (padrão: inscritos) |
| Inserir dados | Botões para inserir blocos prontos com dados capturados (tabela de votos, lista de emendas, linha do tempo) |
| Tags | Impacto, caráter, temas, biomas, regiões, definidos pelo autor |
| Vincular trecho | Selecionar trecho da lei e anexar comentário do parecer |
| Pré-visualizar | Como **Visitante** / como **Assinante** / **PDF** |
| Status | Rascunho → Em revisão → Agendado → Publicado |
| Versões | Histórico do parecer; nova versão quando o texto-base muda, com data de referência |
| SEO | Palavra-chave principal, nome popular, secundárias, título SEO (≤ 60), descrição (≤ 155), endereço; **prévia do resultado no Google**; checklist (palavra-chave no título, H1, endereço e 1º parágrafo; ≥ 3 links internos; texto alternativo; dados estruturados). Ver `docs/SEO.md` |
| Publicar | Publicar agora ou agendar; gera o PDF e a imagem de compartilhamento; atualiza o sitemap e avisa os buscadores; dispara alertas para seguidores **[F3]** |

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

---

## Padrões visuais

- **Setas:** ícones desenhados (traço arredondado), não caracteres de texto. Seta inline após o texto do link; seta em círculo para linhas clicáveis; seta para a esquerda em "voltar". Movem levemente ao passar o mouse.
- **Gráficos de caráter:** barras finas (10px) com percentuais em texto discreto embaixo; tendência como ponto colorido + texto; números de destaque sem caixa, só com linha superior.
- **Placar de votação (sim/não):** azul e roxo, para não sugerir que "sim" é bom ou ruim; verde e laranja ficam reservados para o caráter (proteção).

## Créditos de recursos visuais

- **Bandeiras dos estados:** pacote [icones-bandeiras-br-uf](https://github.com/pierrelapalu/icones-bandeiras-br-uf), de Pierre Lapalu, licença **CC0 1.0** (domínio público). Estilo usado: `rounded` (proporção 3:2, cantos arredondados). Espírito Santo na versão com o lema "Trabalha e Confia"; Paraíba na versão com "NEGO".
- Uso no site: etiqueta de estado (bandeira + nome), bandeira do Brasil para leis federais, bandeira grande no painel do estado, seletor de estado (menu do inscrito e inscrição), cabeçalho do parecer e card do Instagram.
