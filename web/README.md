# Observatório Ambiental — site, painel e coleta

Next.js 16 + Payload CMS 3 + Postgres. O painel fica em `/admin`; o site público, em `/`.

## Rodar no computador

Pré-requisitos: Node 22, pnpm 10 e Postgres 16.

```bash
cd web
cp .env.example .env            # ajuste DATABASE_URL, PAYLOAD_SECRET e CRON_SECRET
createdb observatorio           # e, para os testes, observatorio_teste (TEST_DATABASE_URL no .env)
pnpm install
pnpm migrate                    # cria as tabelas
SEED_ADMIN_EMAIL=voce@exemplo.com SEED_ADMIN_SENHA='uma-senha-forte' pnpm seed
pnpm dev                        # http://localhost:3000 e http://localhost:3000/admin
```

## Comandos

| Comando | O que faz |
|---|---|
| `pnpm dev` | Site e painel em modo de desenvolvimento |
| `pnpm build` / `pnpm start` | Build e servidor de produção |
| `pnpm migrate` | Aplica as migrações do banco |
| `pnpm payload migrate:create <nome>` | Cria migração depois de mudar uma coleção (o CI falha se esquecer) |
| `pnpm seed` | Carga inicial idempotente: áreas, biomas, fontes, palavras-chave e (opcional) o primeiro administrador |
| `pnpm seed:demo` | Conteúdo fictício do protótipo para ver o site no computador (`DEMO_LIMPAR=1 pnpm seed:demo` remove). Bloqueado em produção |
| `pnpm test:unit` | Regras de negócio (prazos, fontes, relevância, indicadores, publicação, cliente HTTP) |
| `pnpm test:int` | Regras que dependem do banco (compromissos, publicação, desatualização, tarefas) |
| `pnpm test:e2e` | Site e painel no navegador (rode `pnpm build` antes) |
| `pnpm fumaca [prefixo]` | Teste de fumaça das APIs oficiais; grava `fumaca-resultado/relatorio.md` |
| `pnpm lint` / `pnpm typecheck` | Qualidade e tipos |

## Onde está cada coisa

| Pasta | Conteúdo |
|---|---|
| `src/collections` | Modelo de dados (coleções do Payload), com as regras de acesso |
| `src/hooks/compromissos.ts` | Abre e fecha os compromissos públicos (prazos prometidos) |
| `src/lib` | Regras puras: datas e dias úteis, compromissos, fontes, relevância, indicadores, publicação |
| `src/coleta` | Cliente HTTP dos conectores e o teste de fumaça das APIs |
| `src/tarefas` | Tarefas agendadas: verificação, publicação de agendados, limpeza |
| `src/endpoints.ts` | `GET /api/saude` e `POST /api/cron/:tarefa` |
| `src/migrations` | Migrações do banco (geradas) |
| `src/seed` | Carga inicial |
| `tests/` | `unit`, `int` (com banco) e `e2e` (navegador) |

## Site público (Sprint 2)

| Endereço | Página |
|---|---|
| `/` | Início: busca, em votação esta semana, explore, mais recentes |
| `/leis` (`?esfera=`, `?situacao=`, `?uf=`) | Lista de leis com filtros |
| `/leis/<slug>` | Lei: texto e fonte oficial, quem está por trás, votações, parecer (ou "em preparação" com "O que já se sabe", ou "acompanhando"), tramitação |
| `/pareceres` e `/pareceres/<slug>` | Opinião e parecer: assinatura no topo, 7 seções, versão analisada, correções |
| `/temas`, `/temas/<slug>`, `/biomas/<slug>` | Temas e biomas (fora da busca do Google até ter texto de abertura) |
| `/artigos`, `/artigos/<slug>` | Artigos |
| `/autores/<slug>` | Página do autor (credenciais para o Google) |
| `/busca?q=` | Busca (não indexada) |
| `/sitemap.xml`, `/robots.txt` | Para os buscadores |

As páginas são geradas no servidor, guardadas em cache e refeitas a cada 5 minutos ou na hora em que o conteúdo muda no painel. Proposições na triagem ou descartadas nunca aparecem. Cada página tem título, descrição, endereço canônico e dados estruturados (docs/SEO.md).

## Painel do autor (Sprint 3)

| Endereço | Tela |
|---|---|
| `/admin` | **Hoje**: compromissos do mais urgente ao menos (com prazo colorido), fontes com problema, votações dos próximos 7 dias com a situação do parecer, meta da semana, promessas no ar |
| `/admin/triagem` | **Triagem**: propostas captadas pela nota de relevância, com as palavras-chave destacadas; Ativar (com prazo e aviso de capacidade), Acompanhar, Descartar (com motivo) |
| `/admin/fila` | **Fila de pareceres**: A atualizar, Prometidos (com "Começar parecer"), Em revisão, Agendados, Publicados |
| Editor do parecer | Faixa de prazo ou de "texto mudou"; aba **Dossiê** (texto, versões com marcação mecânica do que entrou e saiu, autoria, votações, tramitação); checagem de publicação ao vivo; prévia do Google na aba SEO |
| Pedidos | Correção que procede vira registro público no parecer ao preencher "O que foi corrigido" |

## Inscritos e e-mails (Sprint 4)

| Endereço | O quê |
|---|---|
| `/inscricao` | Inscrição em passos (perfil e subgrupo; estudante informa curso e estado; jornalista pede credenciamento) |
| `/entrar` | Acesso sem senha: link mágico de uso único, válido por 1 hora |
| `/conta` | Minha conta: completar perfil, e-mails, leis seguidas, baixar dados (JSON), excluir inscrição |
| `/privacidade`, `/termos` | Textos-base para o autor revisar |
| `/api/baixar/:id` | Download de PDF; só para inscritos confirmados (ou material marcado como aberto) |
| `/api/descadastrar?t=` | Descadastro em um clique (também como cabeçalho List-Unsubscribe) |

E-mails: link de acesso sai na hora; avisos de publicação, respostas, credenciamento e comunicados entram na fila (coleção Envios) e saem a cada 15 minutos, com até 4 tentativas. Sem `RESEND_API_KEY`, aparecem no console.

## Regras automáticas já ativas

- **Parecer prometido:** ao marcar uma proposição como "Parecer prometido (ativa)", nasce um compromisso com prazo (padrão 7 dias, ajustável em Ajustes) e a data vai para a proposição. Se ela passar a "Acompanhando", o compromisso é retirado. Ao publicar o parecer, é cumprido.
- **Texto mudou:** uma nova versão do texto numa proposta com parecer publicado marca o parecer como desatualizado e abre o compromisso de atualização (5 dias). Ao apontar a nova versão, o parecer vira v2, exige a nota "o que mudou" e, publicado, fecha o compromisso.
- **Travas de publicação:** não publica sem as 7 seções, impacto e caráter.
- **Pedidos:** correção (3 dias úteis) e LGPD (15 dias) abrem compromisso e fecham com a decisão. Credenciamento de imprensa (2 dias úteis) é suspenso ao pedir mais informações.
- **Relevância:** toda proposição recebe a nota pelo dicionário de palavras-chave quando o texto muda.
- **Acesso:** visitante só lê pareceres publicados e proposições ativas ou acompanhadas; inscritos, pedidos e compromissos são só da equipe.

Implantação: ver `docs/IMPLANTACAO.md`.
