# Arquitetura — Observatório Ambiental

> Proposta de referência. Sujeita a ajuste na Sprint 1.

## Stack

| Peça | Escolha | Papel |
|---|---|---|
| Site público | **Next.js** (renderização no servidor + páginas estáticas revalidadas) | Velocidade e SEO |
| Painel administrativo | **Payload CMS** (embutido no Next.js) | Editor rico, coleções, papéis de usuário |
| Banco de dados | **Postgres (Supabase)** | Dados, busca textual em português (`tsvector`), autenticação de assinantes, armazenamento de PDFs |
| Coleta e tarefas | Agendamentos do GitHub Actions chamando `POST /api/cron/<tarefa>` com segredo (o cron gratuito da Vercel só roda 1 vez por dia) | Conectores, verificação horária, resumos prévios agendados, limpeza |
| Processamento | Extração de texto de PDF (com OCR de reserva) e comparação de versões | Texto integral, Art. 1º, diferenças entre versões |
| Automação | Conectores, extração de texto de PDF, filtro por palavras-chave | Capturar e organizar dados e textos oficiais. **Não escreve, não resume e não interpreta pareceres** |
| PDF | Geração automática ao publicar | Nota Técnica e Quadro comparativo para inscritos |
| E-mail | Resend ou Brevo | Confirmação, link mágico, alertas, newsletter |
| Arquivos | Supabase Storage (compatível com S3), bucket privado; o acesso passa pelo Payload | Fotos, Parecer técnico e Quadro comparativo |
| Cópia do banco | GitHub Actions: `pg_dump` diário, cifrado, com teste de restauração | Recuperação em caso de falha |
| Hospedagem | Vercel + Supabase | Custo inicial baixo |

## Fluxo de dados

```
Conectores (Câmara, Senado, Congresso, DOU, LexML, [Assembleias])
   │  coleta diária
   ▼
Normalização (formato único de Proposição + Tramitação + Atores)
   │
   ▼
Filtro por palavras-chave (ementa, indexação, texto)  ──►  descartados
   │
   ▼
Pontuação por palavras-chave (pesos do dicionário; eixos e regiões pelos termos encontrados)
   │
   ▼
Caixa de Triagem (painel)  ──  Ativar | Monitorar | Descartar
   │ Ativar
   ▼
Dossiê (texto, justificativa, substitutivos, emendas, votações, legislação afetada)
   │
   ▼
Análise e redação do resumo prévio pelo autor (modelo padrão; classificação definida pelo autor)
   │
   ▼
Publicação (site + PDF) → Alertas e newsletter
```

## Conectores e níveis de automação

Cada fonte é um **conector** independente que entrega dados no formato padrão. Triagem, editor, freemium e alertas são iguais para todas as fontes.

| Nível | Tipo de fonte | Captura |
|---|---|---|
| A | API / dados abertos | Automática |
| B | Site com consulta estruturada | Leitura automatizada do site |
| C | Diário Oficial / Diário da Assembleia em PDF | Extração de texto + palavra-chave |
| D | Nada estruturado | Cadastro manual no painel |

### Fontes federais (MVP e Fase 2)

> Análise detalhada, riscos e teste de fumaça: `docs/APIS.md`.

| Fonte | Conteúdo |
|---|---|
| Câmara — Dados Abertos (API v2) | Proposições, temas, autores, relatores, tramitações, pautas e eventos, votações e votos, inteiro teor |
| Senado — Dados Abertos | Processos (substituindo os serviços antigos de "matéria"), autoria, relatoria, tramitação, agenda, votações, textos |
| Congresso Nacional (via Dados Abertos do Senado) | Vetos e sessões conjuntas |
| Diário Oficial da União (INLABS, Imprensa Nacional; cadastro gratuito) | Edição completa em XML: leis sancionadas, vetos, decretos, MPs, atos do MMA, Ibama, ICMBio |
| LexML / Planalto | Normas consolidadas e legislação afetada |

### Fontes regionais (Fase 4 em diante)

Assembleias Legislativas (26) + Câmara Legislativa do DF, Diários Oficiais estaduais; municipal via Querido Diário. Cada fonte recebe nível A–D no levantamento.

## Modelo de dados (núcleo)

```
Jurisdicao      id, esfera (federal|estadual|municipal), uf, regiao, nome
Fonte           id, jurisdicao_id, nome, conector, nivel (A–D), frequencia, ultima_coleta, ultima_coleta_ok,
                itens_ultima_coleta, media_itens_30d, status (ok|atrasada|fora|volume_baixo|manual), erro
Proposicao      id, fonte_id, casa, casa_origem, tipo, numero, ano, ementa, art1, url_inteiro_teor, texto,
                status_simplificado, status_oficial, data_apresentacao, ultima_movimentacao,
                regime (normal|prioridade|urgencia), relevancia, origem (api|manual),
                situacao_editorial (capturada|triagem|ativa|monitorada|descartada), motivo_descarte,
                prazo_parecer, ativada_em
Tramitacao      id, proposicao_id, data, orgao, descricao, tipo_evento
                (apresentacao|pauta|urgencia|parecer_relator|substitutivo|votacao|sancao|veto|arquivamento)
Versao          id, proposicao_id, data, rotulo (original|substitutivo|redacao_final), texto, url
Parlamentar     id, casa, nome, partido, uf, regiao, foto_url
Autoria         proposicao_id, parlamentar_id, papel (autor|coautor|relator), orgao, data
Emenda          id, proposicao_id, parlamentar_id, data, numero, resumo, texto
Votacao         id, proposicao_id, data, orgao, resultado, placar_sim, placar_nao, placar_abst
Voto            votacao_id, parlamentar_id, voto (sim|nao|abstencao|obstrucao|ausente)
Orientacao      votacao_id, bancada, orientacao
Enfase          id, proposicao_id, eixo, trecho, registrada_por (autor)
Tema            id, nome, slug, eixo                 -- licenciamento, florestas, água...
Bioma           id, nome                              -- Amazônia, Cerrado, Caatinga...
PalavraChave    id, termo, peso, grupo, regiao (nullable), exclusao (bool)

Resumo prévio         id, proposicao_id, versao, versao_texto_id (Versao analisada), data_referencia_texto,
                desatualizado_desde (preenchido quando chega Versao nova), nota_da_versao, impacto (alto|medio|baixo),
                carater (malefico|enfraquece_indiretamente|neutro|benefico), biomas[], areas[], status (rascunho|em_revisao|agendado|publicado),
                publicado_em, atualizado_em, pdf_url, autor_id,
                slug, titulo_seo, meta_descricao, palavra_chave, palavras_secundarias[], nome_popular,
                og_image_url, indexar (bool), canonical_url
Autor           id, slug, nome, titulo, bio, foto_url, linkedin, instagram, x, lattes, email_publico
BlocoParecer    id, parecer_id, ordem, tipo (resumo|o_que_muda|impactos|pontos_atencao|base_legal|recomendacoes|conclusao|tabela|grafico|texto),
                titulo, conteudo

Assinante       id, nome, email, perfil, subperfil (nulo para estudante), curso (só estudante), uf, temas[], biomas[], consentimento_em, opt_newsletter,
                confirmado_em, origem_parecer_id
Assinatura      assinante_id, alvo_tipo (proposicao|tema|bioma|regiao|uf|parlamentar), alvo_id
CredImprensa    assinante_id, veiculo, tipo_veiculo, funcao, link_comprovacao, email_profissional, registro_mtb,
                autoriza_verificacao_em, status (em_analise|verificado|recusado), verificado_por, verificado_em, motivo
Material        id, parecer_id, tipo (nota_tecnica|quadro_comparativo|outro), titulo, arquivo_url, visibilidade (publico|restrito)
Evento          id, assinante_id, tipo (download|leitura|alerta_enviado), parecer_id, material_id, data

Compromisso     id, tipo (parecer_prometido|atualizacao|correcao|credenciamento|lgpd), alvo_tipo, alvo_id,
                aberto_em, prazo_em, status (aberto|cumprido|retirado|vencido), cumprido_em
Pedido          id, tipo (correcao|credenciamento|lgpd), assinante_id, parecer_id, texto, resposta,
                decisao (procede|nao_procede|aprovado|recusado|mais_info), recebido_em, respondido_em
Correcao        id, parecer_id, pedido_id, descricao, feita_em          -- lista pública
Verificacao     id, tipo (fonte|site|paginas|email|backup|links|sitemap), resultado, detalhe, em
Comunicado      id, assunto, mensagem, filtro_perfis[], filtro_subperfis[], filtro_uf, total_previsto,
                status (rascunho|agendado|enviado), agendado_para, enviado_em
Envio           id, tipo (aviso_publicacao|alerta|resumo|acesso|comunicado|resposta_pedido), comunicado_id, assinante_id, parecer_id,
                status (fila|enviado|entregue|retorno), em
```

**Compromisso** é a tabela que sustenta `docs/ENTREGA.md`: toda promessa com prazo nasce aqui, aparece em "Hoje" e muda de cor conforme o prazo. O aviso público ("Resumo prévio em preparação", "Atualização em preparação") é gerado a partir do compromisso aberto; se o compromisso é retirado, o aviso muda no mesmo instante.

## Controle público x restrito

- O **parecer técnico é público** e integralmente indexável.
- São restritos a inscritos os **materiais em PDF**: Nota Técnica e Quadro comparativo (lei vigente × proposta).
- Cada material tem visibilidade `publico` ou `restrito` (padrão: restrito). O servidor só entrega o arquivo a inscritos autenticados (link mágico).
- Para o visitante: os cards dos materiais aparecem com cadeado e o botão de inscrição.
- Os PDFs são gerados ou enviados na publicação e entregues por link assinado e temporário.

## LGPD

Política de privacidade, consentimento registrado com data, finalidade explícita, descadastro em um clique, exportação e exclusão dos dados a pedido, canal de contato do controlador.

## Indicadores (padrão de atuação e panorama)

Calculados a partir dos **pareceres publicados**, nunca de votos individuais.

| Indicador | Cálculo |
|---|---|
| Padrão de atuação | % de resumos prévios por caráter (maléfico, enfraquece indiretamente, neutro, benéfico), agrupados por **jurisdição/casa** (União, Câmara, Senado, Presidência, cada UF) |
| Tudo que tramitou × aprovado | Mesmo cálculo, filtrando as proposições que viraram norma |
| Tendência | Diferença entre benéficos e (maléficos + indiretos): ≥ 15 pontos "tende a proteger"; ≤ −15 "tende a enfraquecer"; senão "equilibrada" |
| Amostra mínima | Grupos com menos de 5 resumos prévios aparecem como "amostra pequena" e não recebem tendência |
| Por bioma e por área | Mesmo cálculo por `Parecer.biomas[]` e `Parecer.areas[]` (um resumo prévio pode contar em mais de um grupo), mais % de alto impacto e contagem de propostas monitoradas |
| Leitura qualitativa | Texto editorial por bioma/área ("principais pressões", "principais avanços", "o que temos visto"), atualizado pelo autor |

Paleta de polaridade (validada para daltonismo): maléfico `#C2551F`, enfraquece indiretamente `#E9A04F` com listras, neutro `#C9CFCB`, benéfico `#1F7A4D`. Percentuais sempre escritos na barra e opção "ver como tabela".

## Credenciamento de imprensa

- O perfil "Jornalista" abre um passo extra na inscrição: veículo, tipo de veículo, função, link de comprovação (obrigatórios), e-mail profissional e registro MTb (opcionais) e autorização de verificação.
- Verificação manual no painel (fila "Credenciamento"), em até 2 dias úteis; e-mail do domínio do veículo agiliza.
- Status: em análise → verificado (selo "Imprensa verificada") ou recusado (com motivo).
- O que entrega hoje: verificação do vínculo e status "imprensa verificada" na conta. Envio de resumos prévios sob embargo ficou fora do escopo inicial; pedido de entrevista, gráficos em PNG e dados em CSV só entram se o autor decidir.
- LGPD: finalidade específica (credenciamento), consentimento separado, dados não compartilhados, exclusão a pedido.

## Dados de parlamentares: o que automatizar (e o que não fazer)

**Princípio:** nenhum dado de parlamentar é cadastrado à mão. Tudo vem de fonte oficial automática ou é subproduto do registro da proposição e do resumo prévio. A energia do autor vai para a análise e o resumo prévio.

| Dado | Federal (Câmara e Senado) | Estadual (Assembleias) |
|---|---|---|
| Lista de parlamentares, partido, UF | API de Dados Abertos (automático) | Resultados oficiais da eleição no TSE: importação **uma vez por legislatura**; ajuste pontual quando um suplente assume |
| Autoria e relatoria | API (automático) | Registrada junto com a proposição monitorada (já é preciso registrá-la para escrever o resumo prévio) |
| Emendas | API (automático) | Só quando constarem na página da proposição; opcional |
| Votos nominais | API (automático) | **Não mostrar.** Raramente publicados em formato aberto e muitas votações são simbólicas; manter só o resultado da votação na página da lei, quando houver |
| Presença | API (automático) | Não mostrar |
| Padrão das propostas de autoria | Calculado dos resumos prévios | Calculado dos resumos prévios (custo zero) |
| Comissões, mandato | API (automático) | Não mostrar (não compensa manter) |
| Foto | API (automático) | Iniciais; foto só se a Assembleia expuser link estável |

Assembleias com dados abertos estruturados (ex.: Minas Gerais) podem ganhar conector próprio no levantamento da Fase 4, sem mudar o desenho da página.

## Contra a desatualização (resumo)

Detalhes, limites e prazos em `docs/ENTREGA.md`.

- **Coletas** às 6h, 12h, 18h e 23h; cada uma grava `ultima_coleta_ok` e o volume.
- **Páginas públicas** mostram a data da última coleta; se a fonte passar de 8 h sem coleta, aparece a nota "fonte oficial fora do ar; dados até…".
- **Nova versão do texto** em proposta com resumo prévio publicado → `Parecer.desatualizado_desde` preenchido, faixa pública "atualização em preparação" e compromisso de atualização aberto.
- **Contagens e gráficos** são consultas ao banco, refeitas a cada publicação; nada é digitado.
- **Verificação horária e diária** (`Verificacao`): fontes, formato das APIs, site no ar, teste das páginas, e-mails, cópia do banco, links oficiais, sitemap. Alertas por e-mail e celular.
- **Testes**: conectores com respostas gravadas + teste diário contra a API ao vivo; testes de navegador das páginas principais a cada mudança no código; ambiente de teste antes do ar.

