# APIs e fontes de dados — análise

> O que cada fonte entrega, como coletar sem perder nada, onde estão os riscos e qual o plano B.
> **Limite desta análise:** o ambiente em que foi escrita bloqueia o acesso aos servidores da Câmara, do Senado e da Imprensa Nacional. Ela se apoia na documentação pública e em relatos de quem usa as APIs. Tudo o que está marcado com **(confirmar)** entra no teste de fumaça do primeiro dia de construção (seção 6).

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
- **Risco principal — votos recentes:** um relato de terceiros (testado em jan/2026) aponta `/votacoes/{id}/votos` **vazio para votações a partir de mai/2024**. **(confirmar)** Se persistir, o plano B é: (1) buscar os votos nos arquivos de dados da Câmara, se publicados; (2) mostrar só placar e orientações, com a nota "votos nominais ainda não publicados pela Câmara" (já previsto em `docs/ENTREGA.md`). Isso afeta o "Sentido do voto" (Panorama e página do parlamentar).
- **Arquivos em massa:** a Câmara publica conjuntos de arquivos (CSV e JSON) para carga inicial. **(confirmar)** quais estão atualizados; se existirem por ano, usamos para a carga histórica e deixamos a API para o dia a dia.

### 2.2 Senado Federal — Dados Abertos

- **Endereço:** `https://legis.senado.leg.br/dadosabertos` · documentação em `/docs/index.html`. Resposta em XML por padrão; JSON pedindo o formato (cabeçalho `Accept` ou sufixo `.json`).
- **Transição em curso:** o Senado está substituindo os serviços antigos de **"matéria"** (`/materia/...`) pelos de **"processo"** (`/processo/...`). Há aviso de desativação para alguns serviços antigos (por exemplo, emendas, com data de 01/02/2026), que continuavam respondendo em set/2026, sem garantia. Serviços de autoria e relatoria também ganharam novas versões, com a antiga disponível por parâmetro de versão por um tempo.
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
- **Plano:** o levantamento da Fase 4 classifica as 27 casas em níveis A–D (API, site estruturado, PDF, manual) e começa pela região-piloto. Onde houver SAPL, um único conector serve a várias casas.

### 2.8 Querido Diário (Fase 7)

- **Endereço:** `https://api.queridodiario.ok.org.br` (busca em `/gazettes` por município, termo e período; documentação em `/docs`).
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
| Votos individuais recentes ausentes na Câmara | Média (relato de 2026) | "Sentido do voto" incompleto | Confirmar no dia 1; plano B com arquivos e nota pública |
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
