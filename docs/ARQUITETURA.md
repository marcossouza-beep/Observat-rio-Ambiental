# Arquitetura — Observatório Ambiental

> Proposta de referência. Sujeita a ajuste na Sprint 1.

## Stack

| Peça | Escolha | Papel |
|---|---|---|
| Site público | **Next.js** (renderização no servidor + páginas estáticas revalidadas) | Velocidade e SEO |
| Painel administrativo | **Payload CMS** (embutido no Next.js) | Editor rico, coleções, papéis de usuário |
| Banco de dados | **Postgres (Supabase)** | Dados, busca textual em português (`tsvector`), autenticação de assinantes, armazenamento de PDFs |
| Coleta | Tarefas agendadas diárias (Vercel Cron ou GitHub Actions) | Conectores das fontes |
| Processamento | Extração de texto de PDF (com OCR de reserva) e comparação de versões | Texto integral, Art. 1º, diferenças entre versões |
| IA | API de modelo de linguagem | Classificação, resumo, ênfases, rascunho do parecer |
| PDF | Geração automática ao publicar | Nota Técnica e Quadro comparativo para inscritos |
| E-mail | Resend ou Brevo | Confirmação, link mágico, alertas, newsletter |
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
Classificação por IA (relevância 0–100, eixos, biomas, regiões, resumo)
   │
   ▼
Caixa de Triagem (painel)  ──  Ativar | Monitorar | Descartar
   │ Ativar
   ▼
Dossiê (texto, justificativa, substitutivos, emendas, votações, legislação afetada)
   │
   ▼
Rascunho do parecer por IA (modelo padrão, tags sugeridas)
   │
   ▼
Revisão do autor → Publicação (site + PDF) → Alertas e newsletter
```

## Conectores e níveis de automação

Cada fonte é um **conector** independente que entrega dados no formato padrão. Triagem, IA, editor, freemium e alertas são iguais para todas as fontes.

| Nível | Tipo de fonte | Captura |
|---|---|---|
| A | API / dados abertos | Automática |
| B | Site com consulta estruturada | Leitura automatizada do site |
| C | Diário Oficial / Diário da Assembleia em PDF | Extração de texto + palavra-chave + IA |
| D | Nada estruturado | Cadastro manual no painel |

### Fontes federais (MVP e Fase 2)

| Fonte | Conteúdo |
|---|---|
| Câmara — Dados Abertos (API v2) | Proposições, temas, autores, relatores, tramitações, pautas e eventos, votações e votos, inteiro teor |
| Senado — Dados Abertos | Matérias, autoria, movimentações, agenda, votações, textos |
| Congresso Nacional (via Dados Abertos do Senado) | Vetos e sessões conjuntas |
| Diário Oficial da União (Imprensa Nacional) | Leis sancionadas, vetos, decretos, MPs |
| LexML / Planalto | Normas consolidadas e legislação afetada |

### Fontes regionais (Fase 4 em diante)

Assembleias Legislativas (26) + Câmara Legislativa do DF, Diários Oficiais estaduais; municipal via Querido Diário. Cada fonte recebe nível A–D no levantamento.

## Modelo de dados (núcleo)

```
Jurisdicao      id, esfera (federal|estadual|municipal), uf, regiao, nome
Fonte           id, jurisdicao_id, nome, conector, nivel (A–D), frequencia, ultima_coleta, status
Proposicao      id, fonte_id, casa, tipo, numero, ano, ementa, art1, url_inteiro_teor, texto,
                status_simplificado, status_oficial, data_apresentacao, ultima_movimentacao,
                regime (normal|prioridade|urgencia), relevancia, origem (api|manual),
                situacao_editorial (capturada|triagem|ativa|monitorada|descartada)
Tramitacao      id, proposicao_id, data, orgao, descricao, tipo_evento
                (apresentacao|pauta|urgencia|parecer_relator|substitutivo|votacao|sancao|veto|arquivamento)
Versao          id, proposicao_id, data, rotulo (original|substitutivo|redacao_final), texto, url
Parlamentar     id, casa, nome, partido, uf, regiao, foto_url
Autoria         proposicao_id, parlamentar_id, papel (autor|coautor|relator), orgao, data
Emenda          id, proposicao_id, parlamentar_id, data, numero, resumo, texto
Votacao         id, proposicao_id, data, orgao, resultado, placar_sim, placar_nao, placar_abst
Voto            votacao_id, parlamentar_id, voto (sim|nao|abstencao|obstrucao|ausente)
Orientacao      votacao_id, bancada, orientacao
Enfase          id, proposicao_id, eixo, trecho, origem (ia|autor), confirmada
Tema            id, nome, slug, eixo                 -- licenciamento, florestas, água...
Bioma           id, nome                              -- Amazônia, Cerrado, Caatinga...
PalavraChave    id, termo, peso, grupo, regiao (nullable), exclusao (bool)

Parecer         id, proposicao_id, versao, data_referencia_texto, impacto (alto|medio|baixo),
                carater (benefico|neutro|malefico), status (rascunho_ia|em_revisao|revisado|agendado|publicado),
                publicado_em, pdf_url, autor_id
BlocoParecer    id, parecer_id, ordem, tipo (resumo|contexto|analise|tabela|grafico|votos|emendas|conclusao|texto),
                titulo, conteudo

Assinante       id, nome, email, perfil, uf, interesses, consentimento_em, opt_newsletter,
                confirmado_em, origem_parecer_id
Assinatura      assinante_id, alvo_tipo (proposicao|tema|regiao|uf|parlamentar), alvo_id
Material        id, parecer_id, tipo (nota_tecnica|quadro_comparativo|outro), titulo, arquivo_url, visibilidade (publico|restrito)
Evento          id, assinante_id, tipo (download|leitura|alerta_enviado), parecer_id, material_id, data
```

## Controle público x restrito

- O **parecer técnico é público** e integralmente indexável.
- São restritos a inscritos os **materiais em PDF**: Nota Técnica e Quadro comparativo (lei vigente × proposta).
- Cada material tem visibilidade `publico` ou `restrito` (padrão: restrito). O servidor só entrega o arquivo a inscritos autenticados (link mágico).
- Para o visitante: os cards dos materiais aparecem com cadeado e o botão de inscrição.
- Os PDFs são gerados ou enviados na publicação e entregues por link assinado e temporário.

## LGPD

Política de privacidade, consentimento registrado com data, finalidade explícita, descadastro em um clique, exportação e exclusão dos dados a pedido, canal de contato do controlador.
