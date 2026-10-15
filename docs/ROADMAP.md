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

**Critério de saída:** base de assinantes em crescimento constante.

## Fase 4 — Levantamento regional

Mapa das 27 casas legislativas estaduais e dos 27 Diários Oficiais: URL, formato, periodicidade, nível de automação (A–D).

## Fase 5 — Região-piloto

Conectores dos estados da região escolhida, palavras-chave regionais, páginas regionais e newsletter regional.

## Fase 6 — Expansão

Uma região por ciclo, repetindo o processo do piloto.

## Fase 7 — Municipal e premium

Capitais e municípios-chave (via Querido Diário). Camada premium definida a partir das métricas acumuladas.
