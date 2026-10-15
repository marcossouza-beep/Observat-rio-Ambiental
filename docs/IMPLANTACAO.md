# Implantação — como colocar no ar

> Sprint 1. O código está pronto para rodar; estes passos dependem de contas que só você pode criar.
> Tempo estimado: 1 a 2 horas, uma vez.

## 1. Banco e arquivos — Supabase

1. Criar um projeto no Supabase (região São Paulo).
2. Em **Database → Connection string**, copiar:
   - a do **pooler, modo transação** (porta 6543) → `DATABASE_URL` da Vercel;
   - a **conexão direta** (porta 5432) → segredo `BACKUP_DATABASE_URL` do GitHub e para rodar `pnpm migrate` na primeira vez.
3. Em **Storage**, criar um bucket **privado** chamado `observatorio`. Em **Storage → S3 Connection**, gerar chave de acesso: anotar endpoint, região, chave e segredo.

## 2. Site — Vercel

1. Importar o repositório na Vercel, com **Root Directory = `web`**.
2. Variáveis de ambiente (Production e Preview):

| Variável | Valor |
|---|---|
| `DATABASE_URL` | pooler do Supabase (porta 6543) |
| `PAYLOAD_SECRET` | 64 caracteres aleatórios (`openssl rand -hex 32`) |
| `CRON_SECRET` | outro valor aleatório |
| `SITE_URL` | endereço do site, sem barra no fim |
| `S3_BUCKET` | `observatorio` |
| `S3_ENDPOINT` | endpoint S3 do Supabase |
| `S3_REGION` | região do Supabase |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | chave do passo 1.3 |

3. Na primeira vez, aplicar as migrações e a carga inicial a partir do seu computador, apontando para a conexão direta:
   ```bash
   cd web
   DATABASE_URL='<conexão direta>' pnpm migrate
   DATABASE_URL='<conexão direta>' SEED_ADMIN_EMAIL=voce@exemplo.com SEED_ADMIN_SENHA='senha-forte' pnpm seed
   ```
   Depois disso, novas migrações rodam sozinhas quando o site inicia (`prodMigrations`).
4. Entrar em `SITE_URL/admin` com o e-mail e a senha do passo anterior e trocar a senha.

## 2.1 E-mails — Resend

1. Criar conta no Resend e **verificar o domínio** do site (registros DNS que o Resend mostra). Sem domínio verificado, os e-mails caem no spam ou não saem.
2. Gerar uma chave de API e cadastrar na Vercel:

| Variável | Valor |
|---|---|
| `RESEND_API_KEY` | chave do Resend |
| `EMAIL_REMETENTE` | ex.: `avisos@seudominio.com.br` (do domínio verificado) |
| `NEXT_PUBLIC_NOME_SITE` | nome definitivo do site |
| `NEXT_PUBLIC_SITE_URL` | mesmo valor de `SITE_URL` |

3. Os links de acesso saem na hora. Avisos de publicação, respostas a pedidos e comunicados saem pela fila, a cada 15 minutos (agendamento "quinze-minutos"), com até 4 tentativas. Todo e-mail para inscrito leva o descadastro em um clique.

## 3. Segredos do GitHub (Settings → Secrets and variables → Actions)

| Segredo | Para quê |
|---|---|
| `SITE_URL` e `CRON_SECRET` | Agendamentos (verificação horária; a cada 15 min: pareceres agendados, comunicados e fila de e-mails; limpeza diária) |
| `BACKUP_DATABASE_URL` e `BACKUP_SENHA` | Cópia diária cifrada do banco, com teste de restauração |
| `PAYLOAD_SECRET` (o mesmo da Vercel) e, se quiser separar, `COLETA_DATABASE_URL` | **Coleta da Câmara e do Senado** 4 vezes ao dia (6h, 12h, 18h e 23h). Sem `COLETA_DATABASE_URL`, usa a `BACKUP_DATABASE_URL` (conexão direta, porta 5432) |
| `INLABS_EMAIL` e `INLABS_SENHA` | Teste do Diário Oficial no teste de fumaça (e, na Fase 2, a coleta) |

Guarde a `BACKUP_SENHA` fora do GitHub: sem ela, as cópias não abrem. Para abrir uma cópia:
`gpg --decrypt banco-AAAAMMDD.dump.gpg > banco.dump` e `pg_restore -d <banco> banco.dump`.

Depois de cadastrar os segredos, rode a coleta uma vez à mão para conferir: GitHub → Actions → **Coleta** → *Run workflow*. O resumo mostra, por casa, quantas propostas foram listadas, quantas entraram na triagem e quantos andamentos, versões, votações e itens de pauta foram gravados. No painel, a tela **Radar** passa a mostrar as novidades.

## 4. INLABS (Diário Oficial da União)

Criar a conta gratuita em inlabs.in.gov.br com um e-mail do projeto e cadastrar os segredos do passo 3.

## 5. Monitor de disponibilidade

Num serviço gratuito (UptimeRobot, Better Stack ou similar), monitorar `SITE_URL/api/saude` a cada 5 minutos, com alerta para o seu e-mail e celular. A resposta traz `"ok": true`, a situação de cada fonte e quantos compromissos públicos estão vencidos.

## 6. Conferir

- [ ] `SITE_URL` abre a página inicial; `SITE_URL/admin` abre o painel em português.
- [ ] `SITE_URL/api/saude` responde `"ok": true`.
- [ ] Aba **Actions** do GitHub: "CI" verde; "Teste das APIs" com o relatório; "Agendamentos" chamando o site; "Backup do banco" com o arquivo cifrado.
- [ ] O monitor externo mostra o site no ar.
- [ ] Inscrever-se com o seu e-mail: o link chega, abre "Minha conta" e o PDF de um parecer baixa.
- [ ] Revisar os textos de `/privacidade` e `/termos` (texto-base escrito para você ajustar).
