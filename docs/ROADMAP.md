# Roadmap — Observatório Ambiental

> Estimativas indicativas. Cada fase só avança quando o critério de saída é atingido.

## Fase 1 — MVP editorial (≈ 8 semanas)

Modelo de dados já preparado para várias esferas (federal, estadual, municipal), com tags de região e bioma.

| Sprint | Entregas |
|---|---|
| 1. Fundação | Repositório, stack, modelo de dados (incluindo Compromisso, Pedido, Verificacao), ambiente de teste, deploy, cópia diária do banco, monitor de site no ar, **teste de fumaça das APIs** (`docs/APIS.md`, seção 6) e cadastro no INLABS |

> **Sprint 1 — feita (código).** Projeto em `web/` (Next.js + Payload + Postgres), modelo de dados completo com migrações, regras de compromissos, travas de publicação e desatualização, `/api/saude` e `/api/cron`, carga inicial, teste de fumaça das APIs, CI, agendamentos e backup no GitHub Actions. Falta só o que depende das suas contas: Supabase, Vercel, segredos do GitHub, INLABS e monitor (`docs/IMPLANTACAO.md`).

| 2. Site público | Home com busca e filtros, categorias, listagem com cards e tags de status, página da proposição, páginas de tema |

> **Sprint 2 — feita (código).** Início, lista de leis com filtros, página da lei (com os três estados: parecer, parecer em preparação com "O que já se sabe", acompanhando), parecer, opinião, temas e biomas, artigos, autor, busca, sitemap e robots; títulos, descrições, canônicos e dados estruturados; páginas atualizadas na hora em que o conteúdo muda. Ficam para depois, como previsto: inscrição e "Avise-me" (Sprint 4), Panorama e padrão de atuação (Fase 3), mapa dos estados, Timeline e Metodologia.

| 3. Painel | Hoje, Pareceres (com prazos e fila "A atualizar"), editor com dossiê ao lado e modelo de 7 seções, classificação, SEO, materiais, publicação com tudo o que o sistema faz sozinho, Pedidos (correções, LGPD), Textos do site, Ajustes de prazos. Protótipo: `prototipo/painel.html` |

> **Sprint 3 — feita (código).** Hoje, Triagem, Fila de pareceres, editor com dossiê (incluindo a marcação do que mudou entre versões), checagem de publicação ao vivo, prévia do Google, nota de relevância automática, correção pública a partir do pedido, meta semanal e datas no formato brasileiro. O envio de e-mails (respostas, alertas, comunicados) entra na Sprint 4, junto com a inscrição.

| 4. Freemium e lançamento | Cadastro com confirmação de e-mail e link mágico, download dos materiais (PDF) para inscritos, política de privacidade e termos, SEO (endereços, títulos e descrições, dados estruturados, sitemaps, Search Console, página e quadro do autor; ver `docs/SEO.md`) |

> **Sprint 4 — feita (código). Fase 1 concluída no código.** Inscrição em passos com perfil e subgrupo (estudante: curso e estado) e credenciamento de imprensa; acesso sem senha por link mágico (uso único, 1 hora); Minha conta (completar perfil, e-mails, leis seguidas, baixar dados, excluir inscrição); "Avise-me" e "Seguir esta lei"; download de PDF só para inscritos confirmados; formulário público de correção com prazo; e-mails por fila (aviso de publicação, respostas, credenciamento, comunicados) com descadastro em um clique; Política de Privacidade e Termos (texto-base). Alertas de tramitação e resumo semanal dependem dos conectores (Fases 2 e 3) e não são oferecidos no site até lá.


**Critério de saída:** 4 a 6 semanas publicando no ritmo de 3 a 10 pareceres por semana, com o checklist de `docs/ENTREGA.md` cumprido e nenhum compromisso público vencido.

## Fase 2 — Radar de votação federal (≈ 4–6 semanas)

- Conectores Câmara, Senado, Congresso (vetos) e DOU.
- Dicionário de palavras-chave com pesos e exclusões.
- Pontuação por palavras-chave e caixa de Triagem.
- **Dossiê automático** entregue ao autor (texto integral, versões, justificativa, tramitação, autores, legislação afetada). O parecer é escrito pelo autor.
- Atores e posicionamentos: autoria, relatoria, emendas, votações, orientações, ênfases.
- Radar com alertas internos: pauta, urgência, substitutivo, votação, sanção, veto.
- **Detecção de nova versão do texto** em proposta com parecer: fila "A atualizar" e faixa pública automática.
- **Fontes e saúde**: coleta 4 vezes ao dia, limites de atraso e de volume, nota pública quando a fonte cai, teste diário contra as APIs ao vivo.

> **Fase 2, parte 1 — feita (código): conectores Câmara e Senado e Radar.**
> - Respostas reais das APIs gravadas no repositório (`pnpm amostras`, fluxo "Gravar amostras das APIs") e usadas nos testes: os conectores são testados sobre dados de verdade, sem depender da rede.
> - Conector da Câmara: lista o que tramitou desde a última coleta (PL, PLP, PEC, MPV, PDL, mais o tema oficial 48, Meio Ambiente), abre a ficha completa do que o site acompanha e do que passa da nota mínima do dicionário; traz autoria, andamentos (tipo pelo código oficial), versões do texto (substitutivo, redação final, texto enviado ao Senado), votações com votos individuais e orientação das bancadas, e a pauta das reuniões deliberativas da semana.
> - Conector do Senado sobre os serviços novos de "processo": atualizados nos últimos dias, processo completo (andamentos, documentos, relatoria, lei gerada), votações nominais e a agenda do Plenário e das comissões.
> - A mesma proposta nas duas casas vira **uma só** no site (chaves extras e número da proposta, ex.: PL 2159/2021 = PL 3729/2004).
> - Gravação sem duplicar; propostas novas entram na **Triagem** com a nota de relevância; o que sai de pauta sai de "Em votação esta semana".
> - **Radar** no painel: entrou na pauta, urgência, substitutivo, votação (com placar), aprovação, sanção, veto, texto novo e mudança de situação. Versões antigas trazidas pela coleta não marcam o parecer como desatualizado; só texto posterior ao analisado.
> - Saúde das fontes: cada coleta fica registrada (com amostra por 90 dias), a fonte guarda a última coleta bem-sucedida, o volume e o erro; formato mudou → a coleta daquela casa para e avisa no painel.
> - Coleta 4 vezes ao dia pelo GitHub Actions (fluxo "Coleta"), e o teste diário das APIs agora roda os dois conectores de ponta a ponta contra a API ao vivo.
>
> **Fase 2, parte 2 — feita (código): Diário Oficial, vetos, texto integral e leis afetadas.**
> - **Diário Oficial (INLABS):** login, Seção 1 e edições extras de cada dia desde a última coleta; leitura dos atos (leis, leis complementares, medidas provisórias, decretos, decretos legislativos e portarias, instruções normativas e resoluções de MMA, Ibama, ICMBio, SFB, ANA, Conama, Funai, Incra, MAPA e MME). Lei de proposta acompanhada vira andamento "sanção" com o texto da lei; mensagem de veto vira andamento "veto"; ato novo relevante pelo dicionário entra na Triagem.
> - **Vetos do Congresso:** cada veto a uma proposta acompanhada vira andamento (total ou parcial, número de dispositivos, data em que passa a trancar a pauta), com o resultado da apreciação (mantido, derrubado) e a pauta das sessões do Congresso.
> - **Texto integral:** a coleta baixa o PDF das versões novas (algumas por rodada), extrai o texto, guarda na versão e dá à proposta o Art. 1º. O dossiê mostra o texto e a marcação do que mudou entre versões. PDF escaneado fica marcado (leitura por OCR fica para depois).
> - **Leis afetadas:** as leis citadas na ementa ("altera as Leis nºs 9.605… e 9.985…") viram links para o LexML, no dossiê e na página da lei.
> - A lei gerada liga as fontes: "Transformado na Lei 15.190/2025" (Câmara/Senado) e a "LEI Nº 15.190" do Diário Oficial caem na mesma proposta.
> - Lei publicada não marca o parecer como desatualizado (repete a redação final); o veto chega ao autor pelo Radar.
>
> Diário Oficial validado com a edição real de 15/10/2026 (314 de 314 atos lidos).
>
> **Falta na Fase 2:** leitura por OCR de PDF escaneado e ajuste fino do dicionário de palavras-chave com o uso real.

**Critério de saída:** a pauta semanal é definida pelo Radar.

## Fase 3 — Alertas e recorrência

- Assinatura por proposição, tema, região, UF e parlamentar.
- E-mail automático a cada mudança de status.
- Newsletter semanal (nacional e regionais).
- Versionamento do parecer quando o texto-base muda.
- Páginas de parlamentar.
- **Credenciamento de imprensa** (passo extra na inscrição, fila de verificação no painel, selo e recursos de imprensa).
- **Padrão de atuação** por UF e por casa da União, e página **Panorama** (casas e estados, biomas, áreas), alimentados pela classificação dos pareceres.

> **Fase 3, parte 1 — feita (código): alertas, resumo semanal, assinaturas e páginas de parlamentar.**
> - **Alerta diário (19h):** um e-mail por pessoa, só quando uma lei que ela segue entra na pauta, recebe urgência ou substitutivo, é votada, aprovada, sancionada ou vetada; no máximo um por dia; só propostas públicas.
> - **Resumo semanal (sexta, 17h):** nota do autor (opcional, na tela "E-mails automáticos" do painel), pareceres da semana, o que vai a voto, o que andou nas leis seguidas, "Do seu interesse" (temas e biomas), "Na sua região" (estado e biomas do estado) e os votos dos parlamentares seguidos. Sai sozinho; o autor pode pular uma semana. Não sai e-mail vazio.
> - **Assinaturas:** na inscrição, alerta diário e resumo semanal aparecem marcados e podem ser desmarcados; na conta, a pessoa muda e-mails, estado, temas e biomas e vê os parlamentares que segue. Quem se inscreveu antes começa com os dois desligados (nunca viu essas opções).
> - **Páginas de parlamentar** (`/parlamentares` e `/parlamentares/[nome]`): em números, como votou (sentido do voto pelo caráter do parecer, com barra e lista), autorias com o padrão das propostas, relatorias e emendas, método explicado; botão Seguir. Autores e relatores na página da lei levam à página do parlamentar.
>
> **Fase 3, parte 2 — feita (código): Padrão de atuação, Panorama e resumo regional.**
> - **Padrão de atuação** (em Leis federais, com o filtro Todas · Câmara · Senado · Presidência, e na lista de cada estado): barras "tudo que tramitou" e "só o que foi aprovado", tendência (ou "amostra pequena" abaixo de 5 pareceres), áreas mais frequentes e link para o método. Cada proposta federal conta para a casa onde começou (campo "Casa de origem", preenchido sozinho pela fonte; medida provisória = Presidência).
> - **Panorama** (`/panorama`): abas Casas e estados (ranking com bandeira, nº de pareceres e de propostas, barra e tendência; alterna "só aprovadas"; "ver como tabela"), Biomas (cartões com pareceres, propostas, barra e % de alto impacto, mais "principais pressões e avanços" quando o autor escreve) e Áreas (quantidade e caráter, mais "O que temos visto"); método no pé. Chamada na home, cartões com números em Temas e biomas e bloco "Para que lado vão as propostas" em cada tema e bioma. Tudo calculado dos pareceres publicados.
> - **Resumo regional:** quem informou o estado recebe a edição da sua região (Norte, Nordeste, Centro-Oeste, Sudeste, Sul): a nota regional do autor (opcional, em "E-mails automáticos"), depois da nacional, e "Na sua região" com as leis dos estados da região e dos biomas que a cobrem, o próprio estado primeiro. Sem estado, edição nacional.
>
> **Fora do escopo inicial (decisão do autor):** envio de pareceres sob embargo à imprensa credenciada. O credenciamento continua (cadastro, verificação no painel e status na conta), sem promessa de envio antecipado.

**Critério de saída:** base de assinantes em crescimento constante.

## Fase 4 — Levantamento regional

Mapa das 27 casas legislativas estaduais e dos 27 Diários Oficiais: URL, formato, periodicidade, nível de automação (A–D).

> **Fase 4 — feita: levantamento em [`docs/LEVANTAMENTO.md`](LEVANTAMENTO.md).**
> - **Como:** o fluxo "Levantamento regional" (GitHub Actions) sonda os sites das 27 casas e dos 27 diários, segue os links de proposições, dados abertos, API e SAPL, e grava as evidências em `web/levantamento/resultado.json`. O nível A–D sai das evidências (`web/src/levantamento/classificacao.ts`), com as revisões registradas e justificadas.
> - **Resultado (15/10/2026):** casas — 9 em A, 4 em B, 4 em C, 10 em D; diários — nenhum com API (20 em C, 7 em D). Sete Assembleias usam o SAPL do Interlegis com a API aberta (AC, AL, AM, PB, PI, RO, TO): um conector só atende todas. ALMG (API de dados abertos) e Alesp (arquivo de proposituras) também estão em A.
> - **Achado importante:** 11 sites não responderam de servidores fora do Brasil em três rodadas (entre eles CLDF, Alepe, ALRS, Ales e Alema). A coleta desses estados vai precisar de um servidor no Brasil.
> - **No painel:** `pnpm levantamento:fontes` registra as 54 fontes estaduais em Fontes, com nível, endereço e motivo, desligadas até cada conector existir.
> - **Região-piloto sugerida pelos números:** Norte (4 de 7 casas em A, todas pelo SAPL).

## Fase 5 — Região-piloto

Conectores dos estados da região escolhida, palavras-chave regionais, páginas regionais e newsletter regional.

> **Fase 5 (Norte) — feita a parte que depende só de nós:**
> - **Conectores:** Assembleias do Acre, Amazonas, Rondônia e Tocantins pelo SAPL (`web/src/coleta/sapl/`), na mesma coleta das 6h, 12h, 18h e 23h. Proposta acompanhada recebe andamentos, situação e autoria; proposta nova só entra na Triagem com nota de relevância suficiente. A fonte de cada casa liga sozinha quando o conector chega (`pnpm levantamento:fontes`); se o autor desligar, fica desligada. Teste ao vivo em "Teste das APIs" (não essencial).
> - **Estadual e federal não se misturam:** o endereço da proposta estadual leva a UF (`to-plo-77-2026`), e a busca por número só junta propostas da mesma esfera e do mesmo estado.
> - **Palavras-chave regionais:** 35 termos dos sete estados (órgãos ambientais, áreas protegidas, rios, conflitos), cada um valendo só nas propostas do seu estado (`pnpm seed`). O autor ajusta em Palavras-chave no painel.
> - **Página regional:** "Leis estaduais" (`/estaduais`), a tela do protótipo: mapa por estado, chips de região, painel do estado com contagens, cobertura real (automático = conector ligado; manual = há leis acompanhadas pelo autor; em breve), padrão de atuação, leis e deputados estaduais.
> - **Newsletter regional:** a edição por região do resumo semanal (Fase 3) agora termina com o botão "Leis estaduais do Norte".
> - **Pendente fora do código:** Pará, Amapá e Roraima estão em nível D (Alepa sem a lista no HTML; Alap não responde de fora do Brasil; ALE-RR usa o SAPL, mas recusa o acesso à API, e é preciso pedir liberação). Ficam em monitoramento manual pelo autor até haver acesso.

## Fase 6 — Expansão

Uma região por ciclo, repetindo o processo do piloto.

## Fase 7 — Municipal e premium

Capitais e municípios-chave (via Querido Diário). Camada premium definida a partir das métricas acumuladas.
