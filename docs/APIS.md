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
- **SAPL — conector (Fase 5, Norte):** `web/src/coleta/sapl/` lê AC, AM, RO e TO. Endpoints usados: `/api/materia/materialegislativa/?data_ultima_atualizacao__gte=` (matérias do período), `/api/materia/tramitacao/?data_tramitacao__gte=` (andamentos do período, porque a tramitação nova nem sempre muda a data da matéria), `/api/materia/tramitacao/?materia=`, `/api/materia/autoria/?materia=`, `/api/base/autor/<id>/` e as tabelas `tipomaterialegislativa`, `statustramitacao` e `unidadetramitacao`. Ficam só projetos de lei, PEC, MP, decreto legislativo e veto; deputado autor vira parlamentar (`sapl:<uf>:parlamentar:<id>`), governo e tribunais ficam com nome e cargo. Teste ao vivo (15/10/2026): as quatro responderam; AC 14, AM 117, RO 379 e TO 0 matérias atualizadas na semana. Roraima usa o SAPL, mas recusa o acesso à API.

- **Roraima — Diário da ALE-RR (Fase 5):** `https://diarios.al.rr.leg.br/wp-json/wp/v2/media?mime_type=application/pdf&after=<data>` lista as edições (PDF, quase diárias); o texto traz os projetos com cabeçalho em maiúsculas ("PROJETO DE LEI Nº 149/2026", "N. 150 DE 2026", "Nº 153, DE 25 DE SETEMBRO DE 2026"), ementa, artigos e assinatura, e os autógrafos ("Autógrafo do Projeto de Lei nº 157/2026"). O SAPL da ALE-RR responde 403 a qualquer acesso de fora (até navegador).
- **Pará — Alepa (Fase 5):** proposições por `POST https://www.alepa.pa.gov.br/Legislativo/CallbackPanelProposicoes` (formulário: `DXCallbackName=cbpProposicoes`, `model[Ano]`, `model[IdTipoProposicao]` — 1 PDL, 2 PEC, 3 PL, 4 PLC —, `model[Texto]`); resposta HTML com 10 cartões por página, das mais novas para as mais antigas, e o total ("669 Resultados"). Detalhes em `GET /Legislativo/DetalhesProposicao?IdProposicao=<id>` (HTML): referências (autor, ementa, regime, situação), tramitação ("dd/mm/aaaa - TEXTO"), votação nas comissões (parecer, relator, PDF em `downloads.alepa.pa.gov.br/Projeto/Parecer/<id>-<n>.PDF`), votação no plenário (turno, data, resultado), dados da lei (número, data, DOE, PDF do Banco de Leis) e anexos; texto do projeto em `downloads.alepa.pa.gov.br/Projeto/<id>.PDF`. Leis aprovadas por `GET https://bancodeleis.alepa.pa.gov.br/api/leis.php?ano=&numero=&q=` (JSON, até 50 por chamada).
- **SAPL no Nordeste (Fase 6):** AL `sapl.al.al.leg.br`, PB `sapl3.al.pb.leg.br`, PI `sapl.al.pi.leg.br`, com os mesmos endpoints do Norte. Teste ao vivo (16/10/2026): AL 191, PB 273 e PI 14 matérias atualizadas na semana.
- **Bahia — Diário Oficial do Legislativo (Fase 6):** edições em `GET https://egbanet.egba.ba.gov.br/apifront/portal/edicoes/ultimas_edicoes.json?subtheme=alba` (JSON: `itens[]` com `id`, `numero`, `data` "dd/mm/aaaa", `suplemento`; as últimas ~40 edições) e PDF em `GET /alba/portal/edicoes/download/<id>`. No texto, cada matéria fica entre `<#E.G.B#<id>#<página>#…>` e `<#E.G.B#<id>#<página>#…/>`; os projetos apresentados começam por "PROJETO DE LEI Nº 26.393/2026" (número contínuo da Alba) e terminam com a assinatura e "(Às Comissões de: …)". O site antigo (`al.ba.gov.br/atividade-legislativa-nova/proposicoes`) parou em 01/08/2025; o SPL novo (`albalegis.nopapercloud.com.br/spl/`, `alba.nopapercloud.app`) responde 403 do Cloudflare a acesso de fora.
- **Ceará — Alece (Fase 6):** sessões em `GET https://www.al.ce.gov.br/legislativo/expediente-historico` (HTML; ~90 sessões, das mais novas para as mais antigas, sem paginação útil) e matérias lidas em `GET /legislativo/expediente-texto/<id>` ("LEITURA DE PROJETOS DE LEI N.º: 593/2026 - Autoria do Deputado … - ementa"; há também CSV em `/legislativo/expediente-historico-csv/<id>`). Lista por legislatura em `GET https://www2.al.ce.gov.br/legislativo/proposicoes/numero.php?nome=31_legislatura&tabela=<projeto_lei|projeto_compl|projeto_emen|projeto_decre|projeto_mens>&opcao=<T|D>&absolutepage=<n>` (20 por página, em ordem de número e depois de ano; declarada ISO-8859-1 com dados em UTF-8): autor, entrada, leitura, ementa, comissões, histórico "Em dd.mm.aa - …", autógrafo, lei, veto, situação. A busca (`busca.php`) não devolve resultados por fora; o conector acha o registro por busca binária nas páginas. Texto do projeto em `www2.al.ce.gov.br/legislativo/tramit<ano>/pl<n>_<aa>.pdf` (HTML até 2023). O Diário da Alece (`doalece.al.ce.gov.br`) exige formulário em JavaScript.
- **Mato Grosso — ALMT (Fase 6):** pesquisa em `GET https://www.al.mt.gov.br/proposicao?almt_form_proposicao_search_proposicao[tipoPropositura]=<1 PL|2 PLC|11 PEC|3 PDL|5 Veto>&...[ano]=&...[numeroPropositura]=&...[dataPublicacaoInicio]=dd/mm/aaaa&page=<n>` (HTML, 10 cartões por página, em ordem crescente de número; o token CSRF não é exigido). Cada cartão: ementa, "Projeto de lei nº 1/2026 Dep. Fulano", protocolo, processo e o PDF em `/storage/webdisco/cp/<aaaammddhhmmss…>.pdf` (o nome traz a data do protocolo). Andamentos em `GET /proposicao/<id>/tramitacoes` ("dd/mm/aaaa - texto", com o PDF do parecer); emendas em `/proposicao/<id>/emendas-e-substitutivos`. A API `api.al.mt.gov.br` exige chave (401).
- **Mato Grosso do Sul — ALEMS:** SGPL público em `https://sgpl.consulta.al.ms.gov.br/sgpl-publico/` (Angular), com API em `/sgpl/sgpl-api/public/` (`proposicoes/`, `proposicao/:id`, `tipoProposicao`, `proponente/autoria`…). Todas essas chamadas exigem o desafio de prova de trabalho (`/captcha/challenge`, cabeçalhos `X-Captcha-*`); sem ele, 403. Não é contornado: fica o pedido de acesso à ALEMS.
- **Minas Gerais — ALMG (Fase 6):** `GET https://dadosabertos.almg.gov.br/ws/proposicoes/pesquisa/direcionada?formato=json&tipo=<PL|PLC|PEC>&ano=&num=&tp=<itens por página>&p=<página>` (JSON: `resultado.noDocumentos`, `resultado.listaItem[]`), em ordem decrescente de número; cada item traz autor, ementa, indexação (`/Tema/...`), situação, local, regime, `dataPublicacao`, `dataUltimaAcao` e `listaHistoricoTramitacoes[]` (passo, data, local, histórico). O filtro por data não existe (é ignorado). Regras: no máximo 2 chamadas simultâneas e 1 segundo entre elas.
- **São Paulo — Alesp (Fase 6):** API da aplicação em `https://legis-api-portal-prd.al.sp.gov.br`: `GET /processo?flPropositura=true&ano=&numero=&listaIdTipoProcesso=<1 PL|2 PLC|5 PEC|4 PDL>&page=&size=&sort=desc` (Spring: `content[]`, `totalPages`; mais novas primeiro), `GET /processo/detalhes/principais/<idProcesso>` (etapa, regime, última tramitação, norma, veto, autores, indexadores, link do processo digital) e `GET /processo/tramitacoes/<idProcesso>?page=&size=&sort=asc` (data e descrição, com HTML). Também `/processo/documentos/<id>`, `/processo/votacaoComissao/<id>` e `/documento?...`. Os dados abertos em arquivo (`repositorioDados/processo_legislativo/proposituras.zip`, 17 MB, XML de 132 MB) ficam de fora.
- **Rio de Janeiro — Alerj:** lista em `http://alerjln1.alerj.rj.gov.br/scpro2327.nsf/Internet/LeiInt?OpenForm&Start=1&Count=<n>` (HTML do Lotus Notes, mais novos primeiro: número como 20260308411, ementa, comissões, data, autor) e detalhe em `/scpro2327.nsf/<visão>/<id>?OpenDocument`. Instável a partir do GitHub.
- **Santa Catarina — Alesc (Fase 6):** e-Legis em `GET https://portalelegis.alesc.sc.gov.br/proposicoes/processo-legislativo?page=<n>&tipoPropositura=<1 PL|2 PLC|7 PEC|6 PDL>&numeroPropositura=&ano=` (HTML, 10 cartões por página, mais novos primeiro: "PL./0640/2026", ementa, entrada, autoria, setor e situação atuais) e ficha em `/proposicoes/<id>/tramitacoes` (regime, matéria legislativa e a linha do tempo: texto, data, setor de origem e de destino). Também `/proposicoes/<id>/documentos`, `/reunioes`, `/emendas`.
- **Paraná — Alep:** a pesquisa legislativa (`consultas.assembleia.pr.leg.br/#/pesquisa-legislativa`, API em `/api/public/...`) exige captcha; ordem do dia e pautas de comissões em PDF (`storage2.assembleia.pr.leg.br/file/public-media/ordem/arquivos/...`); agenda em JSON (`www.assembleia.pr.leg.br/atividade-parlamentar/agenda_api?start=&end=`).
- **Sergipe:** o IOSE (`iose.se.gov.br/apifront/portal/edicoes/ultimas_edicoes.json`, mesmo sistema da EGBA) lista as edições do DOE, mas o download por fora devolve a página do portal, e a Alese não publica os projetos ali.
