# APIs e fontes de dados — análise

> O que cada fonte entrega, como coletar sem perder nada, onde estão os riscos e qual o plano B.
> **Limite desta análise:** o ambiente em que foi escrita bloqueia o acesso aos servidores da Câmara, do Senado e da Imprensa Nacional. Ela se apoia na documentação pública e em relatos de quem usa as APIs. Tudo o que está marcado com **(confirmar)** entra no teste de fumaça do primeiro dia de construção (seção 6).

## 0. Resultado do primeiro teste real (15/10/2026, GitHub Actions)

| Ponto | Resultado |
|---|---|
| Câmara: busca, ficha, autores, tramitação, temas | ✅ Funciona. A ficha traz `statusProposicao` (situação, órgão, regime, despacho, relator) e `urlInteiroTeor` (PDF real, ~150 KB) |
| Câmara: **votos individuais** | ✅ **Disponíveis.** 3 de 5 votações recentes do Plenário trouxeram 399 a 466 votos; as outras 2 vieram vazias (provavelmente votações simbólicas, sem votos nominais). O risco apontado na seção 2.1 não se confirmou |
| Câmara: pautas da semana | ✅ Eventos e itens de pauta |
| Câmara: tema oficial de meio ambiente | ✅ Tema **48** (Meio Ambiente e Desenvolvimento Sustentável); também 54 (Energia, Recursos Hídricos e Minerais) e 64 (Agricultura, Pecuária, Pesca e Extrativismo) |
| Câmara: arquivos em massa | ✅ Por ano e **atualizados diariamente**: proposições (~72 MB em 2026), votações (~8 MB), votos (~32 MB). Servem para carga histórica e conferência |
| Senado: serviço novo `processo` | ✅ Responde em JSON. Campos: identificação, ementa, autoria, situação atual, tramitando, norma gerada, link do documento, código da matéria |
| Senado: serviço antigo `matéria` | ⚠️ Ainda responde, **com aviso de descontinuação**. Confirma a decisão de usar `processo` |
| Senado: votações (`/votacao` por período) e agenda das comissões | ✅ Funcionam |
| Senado: agenda do Plenário | ✅ `/plenario/agenda/mes/{AAAAMMDD}` e `/plenario/agenda/dia/{AAAAMMDD}` |
| Senado: especificação da API | ✅ Publicada em `/dadosabertos/v3/api-docs` (157 caminhos). Os que usaremos estão na seção 2.2 |
| DOU (INLABS) | ✅ Portal no ar; login e download aguardam a conta (segredos `INLABS_EMAIL` e `INLABS_SENHA`) |
| LexML | ✅ Resolução de URN funciona. ❌ A busca SRU devolve uma página de "verificação de segurança" (proteção contra robôs) quando chamada de servidor: **não dá para automatizar a busca**. Decisão: usar só a URN (montada a partir do tipo, data e número da lei) |
| TSE | ✅ Catálogo e arquivo `consulta_cand_2022.zip` (4,4 MB) acessíveis |
| IBGE | ⚠️ O certificado do servidor do IBGE vem incompleto (`UNABLE_TO_VERIFY_LEAF_SIGNATURE`). Decisão: tabela de UFs e regiões fixa no código; municípios (Fase 7) por arquivo baixado uma vez ou incluindo o certificado intermediário |
| Querido Diário | ✅ No endereço novo **`api.queridodiario.org.br`** (2.632 diários de Palmas com "ambiental"). O endereço antigo `api.queridodiario.ok.org.br` não responde mais |

### 0.1 O que a construção dos conectores confirmou (15/10/2026)

| Ponto | Resultado |
|---|---|
| Câmara: o que tramitou num período | `/proposicoes?siglaTipo=…&dataInicio=…&dataFim=…` lista o que **tramitou** no período (não só o que foi apresentado). É a base da coleta incremental |
| Câmara: andamentos | Cada andamento traz `codTipoTramitacao` (tabela `/referencias/proposicoes/codTipoTramitacao`, 235 tipos). O Radar usa o código (ex.: 196 = urgência, 1013 = vetado totalmente) e o texto do despacho |
| Câmara: votações | Votação nominal traz o placar na descrição ("Sim: 231; Não: 87") e os votos em `/votos`; votação simbólica vem sem votos |
| Câmara: pauta | O item de pauta costuma ser o **parecer** (PRL); a proposta principal vem em `proposicaoRelacionada_`. Itens "retirados de pauta" vêm marcados em `situacaoItem` |
| Câmara: número | Proposta que voltou do Senado passa a usar o número único (o PL 3729/2004 aparece como PL 2159/2021) |
| Senado: o que mudou | `/processo?numdias=N&tramitando=S` (máximo 30 dias). `dataInicioApresentacao` com data compacta dá erro 400 |
| Senado: processo | `/processo/{id}` traz tudo: andamentos (`autuacoes[].informesLegislativos`, com documentos associados), situação, ordem do dia, deliberação, lei gerada, classificação temática e outros números da proposta |
| Senado: votações | `/votacao?idProcesso=` traz os 81 votos; os totais vêm vazios e são contados pelos votos |
| Senado: agendas | Plenário em formato antigo (`AgendaPlenario.Sessoes.Sessao`, matérias pelo código antigo); comissões em `AgendaReuniao.reunioes.reuniao[].partes.itens[].doma.idProcesso`. Um item sozinho vem como objeto, vários como lista |

### 0.2 Parte 2 (15/10/2026)

| Ponto | Resultado |
|---|---|
| Vetos | `/materia/vetos/{ano}` (formato antigo, `ListaVetosAnoCN`): veto, proposta vetada, lei gerada, mensagem no Planalto, data em que tranca a pauta. Resultado por dispositivo em `/plenario/resultado/veto/materia/{codigo}` ("Mantido" ou "Rejeitado" = derrubado) |
| Agenda do Congresso | `/plenario/agenda/cn/{inicio}/{fim}`, mesmo formato da agenda do Plenário do Senado; os itens citam o veto, ligado à proposta por chave extra |
| Inteiro teor | PDFs da Câmara (`prop_mostrarintegra?codteor=`) e do Senado (`sdleg-getter`) têm camada de texto: 12 páginas em ~0,3 s, 56 páginas em ~0,4 s |
| INLABS | ✅ **Validado com a edição real de 15/10/2026:** login ok, Seção 1 com 314 atos (ZIP de 2,3 MB), **314 de 314 lidos** pelo conector. O formato é o do exemplo oficial (atributos `artType`, `artCategory`, `pubDate`, `pdfPage`, `idMateria`; campos `Identifica`, `Ementa`, `Texto` em CDATA; arquivos com BOM). As mensagens do Presidente vêm agrupadas num só ato ("Despachos do Presidente da República"), com várias mensagens; o conector separa cada uma. O INLABS recusa dois logins ao mesmo tempo: os fluxos que entram nele fazem fila |

## 1. Resumo

| Fonte | Para quê | Formato | Acesso | Avaliação | Fase |
|---|---|---|---|---|---|
| **Câmara · Dados Abertos (API v2)** | Proposições, autores, relatores, tramitação, pautas, votações, votos, deputados | JSON (REST, documentada em OpenAPI) | Livre, sem chave | **Boa.** Madura e estável; atenção a limite de requisições e a votos recentes | F2 |
| **Senado · Dados Abertos** | Matérias (processos), autoria, relatoria, tramitação, agenda, votações, textos, vetos e MPs | XML (padrão) e JSON | Livre, sem chave | **Boa, em transição.** Os serviços antigos de "matéria" estão sendo trocados pelos de "processo" | F2 |
| **Congresso Nacional** | Vetos, sessões conjuntas, medidas provisórias | Pela API do Senado | Livre | Boa | F2 |
| **Diário Oficial da União (INLABS)** | Leis sancionadas, vetos, decretos, MPs, portarias do MMA, Ibama, ICMBio | XML e PDF da edição completa, por dia e seção | Gratuito, com **cadastro** (e-mail e senha) | **Boa** para coleta diária; não é API de busca | F2 |
| **LexML** | Identificador único das normas (URN) e links para o texto | XML (SRU) | Livre | **Média.** Só metadados; o texto vem do Planalto ou do Senado | F2 |
| **Planalto (legislação compilada)** | Texto vigente das leis alteradas | HTML | Livre, sem API | **Fraca para automação.** Leitura de página; usar só para "lei afetada" | F2 |
| **TSE · Dados Abertos** | Deputados estaduais eleitos (lista da legislatura) | CSV em ZIP | Livre | Boa, mas **só na eleição**; suplentes são manuais | F3 / F5 |
| **IBGE · Localidades** | Códigos de UF e municípios, regiões | JSON | Livre | Muito boa | F1 |
| **Assembleias Legislativas (27)** | Proposições estaduais | Varia: API, site, PDF | Varia | **Heterogênea.** Levantamento na Fase 4 | F4–F5 |
| **Querido Diário** | Diários oficiais municipais | JSON (REST) | Livre | Boa, cobertura parcial | F7 |

**Conclusão:** o escopo federal (Fases 1 a 3) é inteiramente coberto por fontes oficiais, gratuitas e com API. Os dois pontos que exigem cuidado já na construção são a **migração do Senado para os serviços de "processo"** e a **disponibilidade dos votos individuais recentes na Câmara**, que alimentam o "Sentido do voto" e a página do parlamentar.

## 2. Fonte por fonte

### 2.1 Câmara dos Deputados — API v2

- **Endereço:** `https://dadosabertos.camara.leg.br/api/v2` · documentação interativa em `/swagger/api.html`.
- **O que usamos:**

| Recurso | Uso no site |
|---|---|
| `/proposicoes` (filtros: tipo, número, ano, palavras-chave, tema, período de tramitação) | Captura diária e triagem |
| `/proposicoes/{id}` | Ficha: ementa, situação, regime, link do inteiro teor |
| `/proposicoes/{id}/autores` · `/relacionadas` · `/temas` | Autoria, apensados, temas oficiais da Câmara |
| `/proposicoes/{id}/tramitacoes` | Timeline, mudança de status, detecção de substitutivo e de pauta |
| `/proposicoes/{id}/votacoes` · `/votacoes/{id}` · `/votacoes/{id}/votos` · `/votacoes/{id}/orientacoes` | Placar, votos nominais, orientação de bancada |
| `/eventos` e `/eventos/{id}/pauta` (e `/orgaos/{id}/eventos`) | "Em votação esta semana" (plenário e comissões) |
| `/deputados` e `/deputados/{id}` | Página do parlamentar (foto, partido, UF) |

- **Coleta incremental:** a consulta de proposições aceita um período de tramitação. A cada coleta pedimos só o que tramitou desde a última coleta bem-sucedida (com 1 dia de folga), em vez de varrer tudo.
- **Paginação:** até 100 itens por página, com links "próxima" na resposta.
- **Limite de requisições:** não há número oficial publicado; há relato de erro 429 em rajadas. Regra nossa: no máximo 1 a 2 requisições por segundo, repetição com espera crescente, e coleta fora dos horários de pico.
- **Inteiro teor:** é um **PDF** no site da Câmara (link na ficha). Precisa de extração de texto, com OCR de reserva para PDFs escaneados.
- **Votos recentes:** um relato de terceiros apontava `/votacoes/{id}/votos` vazio a partir de mai/2024. **No teste de 15/10/2026 os votos vieram preenchidos** (seção 0). O plano B abaixo continua valendo caso volte a acontecer. Se persistir, o plano B é: (1) buscar os votos nos arquivos de dados da Câmara, se publicados; (2) mostrar só placar e orientações, com a nota "votos nominais ainda não publicados pela Câmara" (já previsto em `docs/ENTREGA.md`). Isso afeta o "Sentido do voto" (Panorama e página do parlamentar).
- **Arquivos em massa:** a Câmara publica conjuntos de arquivos (CSV e JSON) para carga inicial. **(confirmar)** quais estão atualizados; se existirem por ano, usamos para a carga histórica e deixamos a API para o dia a dia.

### 2.2 Senado Federal — Dados Abertos

- **Endereço:** `https://legis.senado.leg.br/dadosabertos` · documentação em `/docs/index.html`. Resposta em XML por padrão; JSON pedindo o formato (cabeçalho `Accept` ou sufixo `.json`).
- **Transição em curso:** o Senado está substituindo os serviços antigos de **"matéria"** (`/materia/...`) pelos de **"processo"** (`/processo/...`). Há aviso de desativação para alguns serviços antigos (por exemplo, emendas, com data de 01/02/2026), que continuavam respondendo em set/2026, sem garantia. Serviços de autoria e relatoria também ganharam novas versões, com a antiga disponível por parâmetro de versão por um tempo.
- **Serviços confirmados na especificação (15/10/2026):** `/processo` (busca), `/processo/{id}`, `/processo/emenda`, `/processo/documento`, `/processo/relatoria`, `/processo/prazo`, `/processo/assuntos`; `/votacao` (por período); `/votacaoComissao/materia/{sigla}/{numero}/{ano}`; `/plenario/votacao/nominal/{ano}`; `/plenario/votacao/orientacaoBancada/{inicio}/{fim}`; `/plenario/agenda/dia|mes/{data}` e `/plenario/agenda/cn/{inicio}/{fim}` (Congresso); `/comissao/agenda/{inicio}/{fim}`; `/plenario/resultado/veto/{codigo}` e `/materia/vetos/{ano}`; `/senador/{codigo}/autorias|relatorias|votacoes`.
- **Decisão:** construir o conector **já sobre os serviços de "processo"** e usar os de "matéria" só onde ainda não houver equivalente, isolados num ponto do código e com alerta se pararem de responder.
- **O que usamos:** busca e detalhe do processo (identificação, ementa, situação, autoria, relatoria, tramitação), emendas, documentos e textos, votações (nominais por matéria e por data), agenda do Plenário e das comissões, senadores. **(confirmar)** os nomes exatos de cada serviço novo na documentação.
- **Congresso Nacional:** vetos, sessões conjuntas e medidas provisórias estão na mesma base do Senado.
- **Textos:** em geral PDF ou DOC; mesma extração de texto da Câmara.
- **Riscos:** troca de versão sem aviso → o teste diário contra a API ao vivo detecta campo ausente e para só este conector (regra de `docs/ENTREGA.md`).

### 2.3 Diário Oficial da União — INLABS (Imprensa Nacional)

- **O que é:** download gratuito, desde 2020, das **edições completas do DOU em XML e PDF**, por dia e por seção (Seção 1 = atos normativos), incluindo edições extras.
- **Acesso:** exige **cadastro gratuito** no INLABS (e-mail e senha). A senha fica guardada como segredo do servidor, nunca no código.
- **Como usamos:** baixar diariamente a Seção 1 (e extras), ler o XML (cada ato traz órgão, tipo, título, ementa e texto) e filtrar por tipo (lei, decreto, medida provisória, mensagem de veto) e por órgão (Presidência, MMA, Ibama, ICMBio, MAPA, MME, ANA) antes do dicionário de palavras-chave.
- **Horário:** a edição normal sai de madrugada; extras podem sair à tarde e à noite. As coletas de 6h, 12h, 18h e 23h cobrem os dois casos.
- **Riscos:** mudança no fluxo de login ou no formato do XML → alerta e coleta manual pelo site do DOU até corrigir. Não há API de busca oficial: a busca é nossa, sobre o XML baixado.
- **Direito de uso:** textos de lei e atos oficiais não têm proteção de direito autoral (Lei 9.610/1998, art. 8º, IV); podem ser reproduzidos com link para a fonte.

### 2.4 LexML e Planalto (texto vigente e lei afetada)

- **LexML:** serviço de busca no padrão SRU (consultas por URL, resposta em XML) sobre os **metadados** das normas, e o identificador **URN LexML** (ex.: `urn:lex:br:federal:lei:2012-05-25;12651`), que é a melhor chave para ligar "lei afetada" a uma norma sem ambiguidade.
- **Limite:** não entrega o texto integral; aponta para onde ele está.
- **Planalto:** o texto compilado das leis federais está em páginas HTML, sem API. Uso restrito: buscar o **artigo alterado** para o quadro "Lei afetada" do dossiê, com cópia guardada e link oficial. Nada de varredura em massa.
- **Alternativa:** o Senado também mantém dados de normas jurídicas na sua API **(confirmar)** se o texto vigente vem completo por lá; se vier, preferimos ao Planalto.

### 2.5 TSE — deputados estaduais

- **Onde:** portal de dados abertos do TSE; arquivo "Candidatos" de cada eleição (ex.: `consulta_cand_2022.zip`), CSV, licença Creative Commons Atribuição, todas as UFs.
- **Uso:** uma vez por legislatura, carregar os **eleitos** para deputado estadual (nome, partido, UF) e cruzar com os resultados (situação de eleito). **(confirmar)** o campo de situação no dicionário de dados do arquivo.
- **Limite:** o TSE não registra posses de suplentes, licenças e trocas de partido no meio do mandato. Por isso: lembrete trimestral no painel e cadastro manual (já previsto).

### 2.6 IBGE — localidades

- **Endereço:** `https://servicodados.ibge.gov.br/api/v1/localidades` (estados, regiões, municípios).
- **Uso:** padronizar UF, região e municípios em todo o banco; base para o Querido Diário (código IBGE) e para a ligação município → bioma.

### 2.7 Assembleias Legislativas (Fase 4)

- **Situação:** não há padrão nacional. Há casas com API (ex.: ALMG), casas com dados abertos em arquivos (ex.: ALESP), casas que usam o **SAPL** do Interlegis (que tem API REST, ex.: `/api/materia/materialegislativa/`) e casas só com site ou diário em PDF.
- **Votos nominais:** raramente publicados em formato aberto (por isso o site não mostra votos estaduais).
- **Plano:** o levantamento da Fase 4 classifica as 27 casas em níveis A–D (API, site estruturado, PDF, manual) e começa pela região-piloto. Onde houver SAPL, um único conector serve a várias casas. **Feito:** resultado em [LEVANTAMENTO.md](LEVANTAMENTO.md) — 7 casas com a API do SAPL aberta (AC, AL, AM, PB, PI, RO, TO), ALMG e Alesp com dados abertos; 11 sites não respondem de fora do Brasil.

### 2.8 Querido Diário (Fase 7)

- **Endereço:** `https://api.queridodiario.org.br` (busca em `/gazettes` por município, termo e período). O endereço antigo `api.queridodiario.ok.org.br` deixou de responder.
- **Uso:** diários municipais das capitais e cidades-chave. Cobertura cresce, mas é parcial; checar município a município.

## 3. De onde vem cada dado do site

| No site | Fonte | Frequência |
|---|---|---|
| Ficha da lei (número, ementa, situação, regime) | Câmara / Senado | 4× ao dia |
| Texto integral e versões | Câmara / Senado (PDF → texto) | A cada nova versão |
| Autoria, relatoria, emendas | Câmara / Senado | 4× ao dia |
| Timeline e mudança de status | Tramitação Câmara / Senado + DOU | 4× ao dia |
| "Em votação esta semana" | Pautas da Câmara e agenda do Senado | 4× ao dia |
| Placar e votos nominais | Votações Câmara / Senado | 4× ao dia (votos recentes da Câmara: ver risco 2.1) |
| Sanção, veto, decreto, MP | DOU (INLABS) + Congresso | 4× ao dia |
| Lei afetada (texto vigente) | LexML (identificação) + Planalto/Senado (texto) | Ao ativar o parecer |
| Deputados federais e senadores | Câmara / Senado | Semanal |
| Deputados estaduais | TSE + cadastro manual | Por legislatura + trimestral |
| UF, região, município | IBGE | Na carga inicial |
| Parecer, caráter, impacto, gráficos | Autor (painel) | A cada publicação |

## 4. Como os conectores devem ser construídos

1. **Um conector por fonte**, todos entregando o mesmo formato (Proposição, Tramitação, Versão, Autoria, Votação, Voto).
2. **Guardar a resposta bruta** de cada coleta (por 90 dias). Se a fonte mudar ou sair do ar, temos o que foi visto e podemos reprocessar.
3. **Coleta incremental** pela data da última coleta bem-sucedida, com 1 dia de sobreposição; a gravação é idempotente (coletar duas vezes não duplica nada).
4. **Respeito à fonte:** limite de requisições, repetição com espera crescente, identificação do robô no cabeçalho (nome do site e e-mail de contato).
5. **Validação de formato:** se um campo obrigatório some, o conector para e avisa; os dados anteriores ficam no ar com a data.
6. **Detecção de nova versão do texto:** comparar o identificador e o resumo do arquivo de cada documento; se mudou em proposta com parecer publicado, abrir o compromisso "atualizar" (ver `docs/ENTREGA.md`).

## 5. Riscos e decisões

| Risco | Probabilidade | Efeito | Decisão |
|---|---|---|---|
| Votos individuais recentes ausentes na Câmara | Baixa (votos vieram no teste de 15/10/2026) | "Sentido do voto" incompleto | Teste diário confere; plano B com arquivos em massa e nota pública |
| Desativação dos serviços antigos do Senado | Alta (já anunciada) | Conector quebra | Construir sobre "processo" desde o início |
| Mudança no login ou no XML do INLABS | Baixa | DOU atrasa | Alerta + coleta manual pelo site |
| Limite de requisições (429) | Média | Coleta lenta | Ritmo controlado e coleta incremental |
| PDF escaneado sem texto | Média | Texto integral ausente | OCR de reserva; marcar "texto extraído por OCR" |
| Assembleias sem dados abertos | Alta | Cobertura estadual parcial | Níveis A–D; cadastro manual onde necessário |

## 6. Teste de fumaça do primeiro dia

Antes de escrever os conectores, rodar e guardar a resposta de cada chamada:

- [ ] Câmara: buscar PL de 2026 com "licenciamento"; abrir a ficha, autores, tramitações e o link do inteiro teor.
- [ ] Câmara: pegar uma votação de plenário de 2026 e verificar se `/votos` vem preenchido.
- [ ] Câmara: listar os eventos da semana e a pauta de um deles.
- [ ] Câmara: verificar quais arquivos em massa existem e até que ano estão atualizados.
- [ ] Senado: na documentação, listar os serviços de "processo" e o equivalente de cada serviço de "matéria" que usaríamos; testar busca, detalhe, autoria, relatoria, emendas, textos e votação de um PL.
- [ ] Senado: agenda do Plenário e das comissões da semana.
- [ ] Senado: um veto e uma medida provisória recentes.
- [ ] INLABS: criar a conta, baixar a Seção 1 de um dia e conferir a estrutura do XML.
- [ ] LexML: resolver a URN do Código Florestal e buscar uma lei por número.
- [ ] TSE: abrir `consulta_cand_2022` e identificar o campo de eleito.
- [ ] Registrar em cada caso: tempo de resposta, formato, campos presentes, erros.

Resultado esperado: esta análise atualizada com o que foi confirmado, e os itens **(confirmar)** resolvidos.

## 7. Serviços de apoio (não são fontes de dados)

| Serviço | Uso |
|---|---|
| Resend ou Brevo | E-mails (acesso, alertas, resumo, comunicados), com retorno de entrega |
| Google Search Console e Bing Webmaster | Indexação e erros; envio de sitemap |
| IndexNow | Aviso imediato de página nova ou atualizada |
| Supabase | Banco, autenticação dos inscritos, armazenamento dos PDFs |
| Monitor externo de disponibilidade | Site no ar a cada 5 minutos |

## Referências consultadas

- Câmara dos Deputados — Dados Abertos: https://dadosabertos.camara.leg.br/swagger/api.html · https://www2.camara.leg.br/transparencia/dados-abertos/dados-abertos-legislativo
- Relato de limitações da API da Câmara (terceiros): https://glama.ai/mcp/servers/@gvc2000/AgenteCidadaoMCP/blob/297aa658a904cd3b543a19b2bc88bb929d19cb60/docs/LIMITACOES_API_CAMARA.md
- Senado — Dados Abertos: https://legis.senado.leg.br/dadosabertos/docs/resource_MateriaService.html · https://www12.senado.leg.br/dados-abertos/conjuntos?portal=Legislativo&grupo=projetos-e-materias · https://www12.senado.leg.br/dados-abertos/conjuntos?portal=Legislativo&grupo=plenario
- Aviso de novas versões de serviços do Senado: https://groups.google.com/g/thackday/c/bTQhV1eF4dw
- Desativação de serviços de "matéria" (relato em projeto de coleta): https://github.com/vsntos/coletor_emendas
- Imprensa Nacional (INLABS): https://github.com/Imprensa-Nacional
- LexML: https://www12.senado.leg.br/dados-abertos/legislativo/legislacao/acervo-do-portal-lexml · https://en.wikipedia.org/wiki/Lex_(URN)
- TSE — Candidatos 2022: https://dadosabertos.tse.jus.br/km/dataset/candidatos-2022/resource/435145fd-bc9d-446a-ac9d-273f585a0bb9
- SAPL (Interlegis): https://github.com/interlegis/sapl/issues/2728
- Querido Diário: https://docs.queridodiario.ok.org.br/pt-br/latest/utilizando/api-publica.html · https://github.com/okfn-brasil/querido-diario-api
