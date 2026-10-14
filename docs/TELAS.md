# Telas e funcionalidades — Observatório Ambiental

> Especificação funcional. Rascunhos visuais: **site público** em `prototipo/index.html` e **painel do autor** em `prototipo/painel.html`.
> Foco atual: painel e entrega real de tudo o que o site promete (ver `docs/ENTREGA.md`).
> Fase indicada entre colchetes: **[F1]** MVP, **[F2]** Radar, **[F3]** Alertas, **[F5]** Regional.

---

# Parte A — Site público

## A1. Home

**Objetivo:** levar o visitante ao que interessa em um clique e mostrar o que está prestes a ser votado.

Ordem dos blocos, de cima para baixo:

| Bloco | Funcionalidade | Fase |
|---|---|---|
| Cabeçalho | Logo, menu, **Entrar** e botão **Se inscreva grátis**; para inscritos, menu e avatar (A10) | F1 |
| Abertura e busca | Frase de abertura, campo único de busca (termo, número do PL, parlamentar, tema) e atalhos "Experimente:" (ex.: licenciamento, Pantanal, Tocantins, garimpo) que preenchem a busca e levam à lista | F1 |
| Em votação esta semana | Até 3 itens com data em destaque, título, bandeira da esfera e órgão onde será votado; link "Ver Timeline" | F2 (manual na F1) |
| Explore | 4 cartões (2 × 2) com ícone próprio, descrição curta e contagem: Leis federais, Leis estaduais, Opinião, Artigos. Timeline e Panorama têm acesso pela agenda e pela chamada do Panorama | F1 |
| Mais recentes | Lista das proposições com filtro de situação (Todas, Em tramitação, Aprovadas) no título do bloco e contagem; cards com "Ler parecer" ou "Parecer em breve" | F1 |
| Panorama (chamada) | Barra fina com o padrão de atuação geral e link para o Panorama | F3 |
| Chamada de cadastro | "Notas técnicas e quadros comparativos grátis para inscritos" | F1 |
| Rodapé | Temas e biomas, Metodologia, Correções, Independência, Política de privacidade, Termos de uso | F1 |

**Ícones:** traço único (1,8 px), cor verde da marca, sobre quadrado verde-claro de cantos arredondados. Em telas estreitas, os cartões do Explore viram uma coluna. Temas e biomas ficam fora da home; o acesso é pelo rodapé, pelo Panorama e pelos "Assuntos" de cada parecer.

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

**Lei ainda sem parecer:** o bloco do parecer vira "Parecer em preparação" (publicado nos próximos dias, na mesma página), com "O que já se sabe" (frase automática com casa, autoria, etapa, votações e emendas) e o botão "Avise-me quando o parecer sair". O bloco Material não aparece até o parecer sair.

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

## A21. Temas e biomas

**Índice (`/temas`):** cartões dos 7 biomas e das 11 áreas, cada um com nº de pareceres, barra de caráter e % de alto impacto.

**Página de bioma ou tema (`/biomas/cerrado`, `/temas/especies-exoticas`):**

| Bloco | Conteúdo |
|---|---|
| Cabeçalho | Trilha de navegação, nome, **texto de abertura escrito pelo autor** (importante para SEO), tendência e botão Seguir |
| Números | Propostas acompanhadas, pareceres, % de alto impacto, em tramitação agora |
| Para que lado vão as propostas | Barra de caráter com percentuais e legenda |
| Leitura qualitativa | Bioma: principais pressões e avanços. Tema: "O que temos visto" |
| Leis acompanhadas | Cards com estado, status, caráter e "Ler parecer" ou "Parecer em breve" |
| Estados | Bioma: estados que o bioma abrange; tema: estados com leis sobre o tema. Monitorados levam à página do estado; os demais aparecem em cinza |
| Relações | Bioma → temas mais frequentes; tema → biomas onde mais aparece |
| Artigos relacionados | Até 2 |

Acesso: rodapé, Panorama (nome do bioma e "Ver página do tema") e "Assuntos" de cada parecer.

---

# Parte B — Painel do autor

> Protótipo: `prototipo/painel.html`. O painel existe para cumprir o que o site promete, no prazo, sem nada desatualizado (ver `docs/ENTREGA.md`). Funciona no computador (menu lateral) e no celular (barra inferior: Hoje, Triagem, Pareceres, Pedidos, Mais).

Menu: **Trabalho** (Hoje, Triagem, Pareceres, Pedidos) · **Sistema** (Fontes e saúde, E-mails) · **Conteúdo** (Textos do site, Palavras-chave, Inscritos, Ajustes).

## B1. Hoje **[F1]**

| Bloco | Conteúdo |
|---|---|
| Situação | Itens urgentes e pareceres prometidos em aberto |
| Desde ontem | Novas na triagem · leis que mudaram de situação · textos que mudaram depois do parecer · alertas enviados |
| Precisa de você | Lista única, do mais urgente: texto mudou em lei com parecer, parecer prometido atrasado ou perto do prazo, correção, credenciamento, fonte fora do ar. Cada item tem prazo e a ação direta (Abrir, Nova data, Só acompanhar, Responder, Verificar) |
| Votações dos próximos 7 dias | Pauta oficial com a situação do parecer (publicado, desatualizado, em preparação com progresso) |
| Meta da semana | Publicados, agendados, em revisão e em preparação contra a meta |
| Fontes e sistema | Resumo da saúde das fontes |
| Promessas no ar | Quantas páginas mostram "Parecer em preparação" e "Atualização em preparação"; quantas pessoas aguardam aviso |

## B2. Triagem **[F2]**

| Elemento | Funcionalidade |
|---|---|
| Lista | Nota de relevância (0–100), número, fonte, data, ementa com as palavras-chave destacadas, temas encontrados, sinal de "provável homenagem" |
| Filtros | Todas, Câmara, Senado, DOU, Estados |
| Capacidade | "Pareceres prometidos em aberto: 5 de 10". No limite, ativar pede prazo maior ou sugere acompanhar |
| Ativar parecer | Janela com prazo (padrão 7 dias), prévia do aviso público e efeito na capacidade. Ao confirmar, o aviso "Parecer em preparação" vai ao ar e o dossiê fica pronto |
| Acompanhar | A página pública mostra "Acompanhando", sem prometer parecer |
| Descartar | Com motivo (fora do tema, homenagem ou data, duplicada, outro); o motivo ajusta as palavras-chave |

## B3. Pareceres **[F1]**

Abas: **A atualizar** · Em preparação · Em revisão · Agendados · Publicados · Acompanhando. Cada linha mostra prazo (com cor), progresso nas 7 seções, versão do texto analisada e quantas pessoas aguardam aviso. "A atualizar" recebe sozinho todo parecer cujo texto-base mudou.

## B4. Editor do parecer **[F1]**

| Elemento | Funcionalidade |
|---|---|
| Topo | Etapas (Rascunho → Em revisão → Agendado → Publicado), salvamento automático, pré-visualizar (visitante, inscrito, PDF) |
| Faixa de contexto | Prazo prometido, data da votação, pessoas aguardando; ou, se o texto mudou, o que a página pública está mostrando |
| Dossiê (esquerda) | Texto · Versões (com marcação mecânica do que entrou e saiu entre versões, como o controle de alterações de um editor de texto) · Tramitação · Atores · Lei afetada. Nada do dossiê é escrito no parecer sozinho |
| Parecer | As 7 seções do modelo fixo (Resumo, O que muda, Impactos por dimensão, Pontos de atenção, Base legal, Recomendações, Conclusão); em nova versão, campo "O que mudou nesta versão" |
| Classificação | Impacto, caráter (4 categorias com definição), áreas, biomas. Alimenta os gráficos ao publicar |
| SEO | Prévia do Google, palavra-chave, nome popular, título (≤ 60), descrição (≤ 155), endereço; checklist ao vivo (ver `docs/SEO.md`) |
| Materiais | Nota técnica e Quadro comparativo em PDF; visibilidade (padrão: só inscritos) |
| Publicar | Agora ou agendar; embargo para imprensa credenciada; travas (seções, impacto, caráter, nota de versão) e avisos (nota técnica, SEO); lista do que o sistema faz sozinho ao publicar: troca o aviso pelo parecer no mesmo endereço, envia os e-mails, atualiza gráficos, Timeline, sitemap e buscadores, gera imagem e PDF |

## B5. Pedidos **[F1 / F3]**

Abas **Correções** (prazo público de 3 dias úteis; "Procede" abre a resposta e registra a correção no parecer e na página de Correções; "Não procede" responde com a justificativa) · **Imprensa** (veículo, função, e-mail com aviso de domínio do veículo, comprovação, registro; Aprovar, Pedir mais informações, Recusar; prazo de 2 dias úteis) · **Dados pessoais** (LGPD, prazo de 15 dias; excluir e avisar).

## B6. Fontes e saúde **[F2]**

Tabela de fontes: nível A–D, última coleta bem-sucedida, itens contra a média, situação (ok, fora há X h, volume baixo, manual) e ação (coletar agora, ver amostra, cadastrar). Quando uma fonte cai, mostra a nota que está no ar nas páginas públicas. Bloco **Sistema**: site no ar, teste diário das páginas, e-mails, cópia do banco, links oficiais, sitemap e Search Console.

## B7. E-mails **[F3]**

Resumo semanal montado sozinho, com nota opcional do autor (sai mesmo sem ela); envios do dia (alertas agrupados, embargos, avisos de publicação); números de entrega; regras (no máximo 1 alerta por pessoa por dia, só eventos relevantes, descadastro em um clique).

## B8. Textos do site **[F1]**

Temas e biomas (com e sem texto de abertura; sem texto, a página fica fora da busca; data para revisar), Artigos, Página do autor (foto, título, biografia, redes) e Metodologia (versão e compromissos a confirmar).

## B9. Palavras-chave **[F2]**

Termo, grupo, peso, exclusão e capturas em 30 dias; teste de um termo novo antes de salvar.

## B10. Inscritos **[F1]**

Totais, crescimento, jornalistas credenciados, conversão, parecer que levou à inscrição, perfis; exportação CSV.

## B11. Ajustes

Prazos prometidos (parecer, atualização, correção, imprensa, LGPD) e limite de pareceres em aberto, que comandam os avisos do painel e os textos públicos; canais de alerta do autor; pessoas e papéis (autor, revisor, administrador).

---

## Padrões visuais

- **Setas:** ícones desenhados (traço arredondado), não caracteres de texto. Seta inline após o texto do link; seta em círculo para linhas clicáveis; seta para a esquerda em "voltar". Movem levemente ao passar o mouse.
- **Gráficos de caráter:** barras finas (10px) com percentuais em texto discreto embaixo; tendência como ponto colorido + texto; números de destaque sem caixa, só com linha superior.
- **Placar de votação (sim/não):** azul e roxo, para não sugerir que "sim" é bom ou ruim; verde e laranja ficam reservados para o caráter (proteção).

## Créditos de recursos visuais

- **Bandeiras dos estados:** pacote [icones-bandeiras-br-uf](https://github.com/pierrelapalu/icones-bandeiras-br-uf), de Pierre Lapalu, licença **CC0 1.0** (domínio público). Estilo usado: `rounded` (proporção 3:2, cantos arredondados). Espírito Santo na versão com o lema "Trabalha e Confia"; Paraíba na versão com "NEGO".
- Uso no site: etiqueta de estado (bandeira + nome), bandeira do Brasil para leis federais, bandeira grande no painel do estado, seletor de estado (menu do inscrito e inscrição), cabeçalho do parecer e card do Instagram.
