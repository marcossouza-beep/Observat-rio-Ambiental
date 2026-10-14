# Entrega — cumprir tudo o que o site promete

> Regra de ouro: **o site só promete o que o sistema consegue garantir ou o que o painel cobra do autor com prazo.** Cada promessa abaixo tem um mecanismo, um prazo, um alarme e um comportamento previsto para quando falhar. Nada fica "parado e errado" em silêncio.

## 1. Seis regras contra a desatualização

1. **Nada que a máquina calcula é digitado.** Contagens, gráficos, padrão de atuação, "Em votação esta semana", status das leis e números da home saem do banco a cada atualização. Não existe número escrito à mão no site.
2. **Todo dado automático mostra a data.** "Tramitação atualizada em 14/10, 06:10 (Câmara)". Se a coleta falhar, a data denuncia; não fingimos que está atual.
3. **Falha da fonte vira aviso, não erro.** Se uma fonte passa do limite sem coleta, a página mostra os últimos dados com a nota "Fonte oficial fora do ar desde 13/10; dados até essa data". O painel alerta o autor no mesmo minuto.
4. **Texto mudou, parecer é marcado.** Quando chega substitutivo, emenda aprovada ou redação final de uma proposta que já tem parecer, o sistema compara com a versão analisada. Se mudou, o parecer ganha a faixa pública "O texto mudou em 10/10. Este parecer analisa a versão de 02/10; atualização em preparação" e entra na fila "A atualizar" do painel.
5. **Toda promessa com prazo vira cronômetro no painel.** Parecer prometido, correção, credenciamento, pedido de dados (LGPD): cada um nasce com data-limite, aparece em "Hoje" e fica vermelho quando atrasa.
6. **Promessa que não será cumprida é retirada.** Se o parecer prometido não vai sair, o autor troca para "Acompanhando" em um clique e o aviso público muda. O site nunca deixa uma promessa vencida no ar.

## 2. Inventário: o que o site promete e como cumprimos

### Dados automáticos (o sistema garante)

| Promessa no site | Onde aparece | Como é cumprida | Frequência | Alarme | Se falhar, o site mostra |
|---|---|---|---|---|---|
| "Informações da tramitação oficial, atualizadas automaticamente" | Página da lei | Conectores Câmara, Senado, Congresso, DOU | 4 vezes ao dia (6h, 12h, 18h, 23h) | Fonte sem coleta bem-sucedida há mais de 8 h | Dados da última coleta + nota com a data |
| "Em votação esta semana" | Home, Timeline | Pautas oficiais (agenda de plenário e comissões) | 4 vezes ao dia; item some quando a data passa ou sai de pauta | Pauta vazia em dia de sessão (suspeita de falha) | Bloco some; nunca mostra data passada |
| Status (Em tramitação, Aprovada, Sancionada, Vetada) | Cards, lei, parecer | Último evento da tramitação | A cada coleta | Mudança de status de lei com parecer → aviso no painel | Status anterior + data da coleta |
| Votos e placar | Lei, parlamentar | Votações nominais da Câmara e do Senado | A cada coleta | Votação registrada sem votos nominais após 24 h | "Votos nominais ainda não publicados pela casa" |
| Emendas e autoria | Lei | Conectores | A cada coleta | — | Lista da última coleta |
| Timeline | Timeline, lei | Eventos gerados pela tramitação + eventos editoriais (parecer publicado, correção) | A cada coleta e a cada publicação | — | Eventos até a última coleta |
| Contagens, gráficos e padrão de atuação | Home, Panorama, estados, parlamentares, temas, biomas | Calculados das classificações dos pareceres publicados | A cada publicação, correção ou nova versão | Contagem diverge do banco (teste diário) | Sempre coerente: é a mesma consulta |
| Texto integral e link para a fonte | Lei | Inteiro teor do conector + link oficial | A cada nova versão | Link oficial quebrado (verificação semanal) | Texto guardado + "link oficial indisponível" |
| Deputados estaduais | Página de deputados | Lista do TSE, uma vez por legislatura; posse de suplentes cadastrada pelo autor | Por legislatura + lembrete trimestral | Lembrete trimestral no painel | — |

### Prazos que dependem do autor (o painel cobra)

| Promessa no site | Prazo proposto | Começa a contar | Avisos no painel | Se vencer |
|---|---|---|---|---|
| "Parecer será publicado nos próximos dias" | **7 dias corridos** (ajustável) | Ao ativar a proposta na triagem | Amarelo no 5º dia, vermelho no 7º | Autor escolhe: nova data (o aviso público continua) ou "Acompanhando" (o aviso muda) |
| Parecer atualizado após mudança no texto | **5 dias corridos** | Quando o sistema detecta a mudança | Fila "A atualizar" | A faixa "atualização em preparação" continua visível; nunca some sem nova versão |
| Correções: "Respondemos por e-mail em até 3 dias úteis" | 3 dias úteis | Envio do formulário | Contador por pedido | Vermelho em "Hoje" até responder |
| Credenciamento de imprensa: "em até 2 dias úteis" | 2 dias úteis | Envio do pedido | Contador por pedido | Vermelho em "Hoje" |
| Pedido de dados ou exclusão (LGPD) | 15 dias (lei) | Pedido recebido | Contador | Vermelho em "Hoje" |
| Meta de 3 a 10 pareceres por semana | Semanal | Segunda-feira | Barra de meta em "Hoje" | Só indicador interno; não é promessa pública |

**Freio de capacidade:** a triagem mostra quantos pareceres prometidos já estão abertos. Acima de 10 abertos, o botão "Ativar" pede uma data mais longa ou sugere "Acompanhar". Assim o aviso "nos próximos dias" nunca é dado a mais propostas do que o autor consegue escrever.

### E-mails (o sistema envia, o painel registra)

| Promessa | Quando sai | Garantia |
|---|---|---|
| "Você recebe um e-mail no dia da publicação" (Avise-me) | No ato da publicação do parecer | Fila de envio com nova tentativa; registro por pessoa |
| "Um e-mail quando a lei que você segue andar" | Depois de cada coleta, agrupado (no máximo 1 e-mail por pessoa por dia) | Só eventos relevantes: pauta, votação, aprovação, sanção, veto, novo parecer |
| "Resumo semanal" | Sexta, 17h, montado automaticamente; o autor pode acrescentar uma nota até a hora do envio | Se o autor não mexer, sai assim mesmo |
| Embargo para imprensa credenciada | Ao agendar um parecer com embargo | Envio com data e hora de liberação no assunto |
| Confirmação e link de acesso | Na hora | Monitoramento de entrega e de retorno (bounce) |

## 3. Monitoramento

Uma verificação automática roda a cada hora e uma completa todo dia às 7h. Alertas chegam por e-mail e notificação no celular do autor (Telegram ou WhatsApp, a definir).

| Verificação | Limite | Ação |
|---|---|---|
| Última coleta bem-sucedida por fonte | 8 h | Alerta + nota pública com a data |
| Volume coletado fora do normal | Menos de 30% da média dos últimos 30 dias úteis | Alerta (possível mudança na API) |
| Formato da resposta da API mudou | Campo obrigatório ausente | Coleta daquela fonte para; alerta; dados anteriores preservados |
| Site no ar | Verificação externa a cada 5 min | Alerta |
| Páginas principais funcionando | Teste automático diário (home, lei, parecer, inscrição, download) | Alerta |
| E-mails | Taxa de retorno > 3% ou fila parada > 30 min | Alerta |
| Links oficiais | Semanal | Lista no painel |
| Sitemap e Search Console | Diário | Erros no painel |
| Cópia de segurança do banco | Diária, com teste mensal de restauração | Alerta se falhar |

## 4. Como evitar que algo quebre

- **Ambiente de teste** separado do site no ar; nada vai para o ar sem passar por ele.
- **Testes dos conectores** com respostas reais gravadas das APIs + um teste diário contra a API ao vivo (detecta mudança de formato antes de afetar o site).
- **Testes automáticos das páginas** (navegador) a cada mudança no código: home, busca, lei com e sem parecer, parecer, inscrição, download de material, painel.
- **Publicação reversível:** cada versão do site pode voltar à anterior em um clique; cada parecer guarda o histórico de versões.
- **Fontes independentes:** se uma fonte cai, as outras continuam; nenhum conector derruba o site.
- **Páginas geradas no servidor e guardadas em cache:** se o banco ficar lento, o leitor ainda vê a última versão da página.

## 5. Antes de lançar (checklist de entrega)

- [ ] Todas as promessas desta lista testadas de ponta a ponta no ambiente de teste.
- [ ] Prazos confirmados pelo autor (7 dias para parecer prometido, 5 para atualização, 3 úteis para correção, 2 úteis para credenciamento).
- [ ] Conectores federais rodando por 2 semanas sem intervenção.
- [ ] Alertas chegando ao celular do autor.
- [ ] Teste de restauração do banco feito.
- [ ] Política de privacidade, termos e canal LGPD no ar.
- [ ] Pelo menos 8 pareceres publicados antes da divulgação (o site não estreia vazio).
