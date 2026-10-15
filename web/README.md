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

## Regras automáticas já ativas

- **Parecer prometido:** ao marcar uma proposição como "Parecer prometido (ativa)", nasce um compromisso com prazo (padrão 7 dias, ajustável em Ajustes) e a data vai para a proposição. Se ela passar a "Acompanhando", o compromisso é retirado. Ao publicar o parecer, é cumprido.
- **Texto mudou:** uma nova versão do texto numa proposta com parecer publicado marca o parecer como desatualizado e abre o compromisso de atualização (5 dias). Ao apontar a nova versão, o parecer vira v2, exige a nota "o que mudou" e, publicado, fecha o compromisso.
- **Travas de publicação:** não publica sem as 7 seções, impacto e caráter.
- **Pedidos:** correção (3 dias úteis) e LGPD (15 dias) abrem compromisso e fecham com a decisão. Credenciamento de imprensa (2 dias úteis) é suspenso ao pedir mais informações.
- **Acesso:** visitante só lê pareceres publicados; inscritos, pedidos e compromissos são só da equipe.

Implantação: ver `docs/IMPLANTACAO.md`.
