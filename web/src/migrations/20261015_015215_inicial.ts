import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_proposicoes_autoria_papel" AS ENUM('autor', 'coautor', 'relator');
  CREATE TYPE "public"."enum_proposicoes_esfera" AS ENUM('federal', 'estadual', 'municipal');
  CREATE TYPE "public"."enum_proposicoes_casa" AS ENUM('camara', 'senado', 'congresso', 'presidencia', 'assembleia', 'camara_municipal');
  CREATE TYPE "public"."enum_proposicoes_status_simplificado" AS ENUM('em_tramitacao', 'aprovada', 'norma', 'vetada', 'arquivada', 'rejeitada');
  CREATE TYPE "public"."enum_proposicoes_regime" AS ENUM('normal', 'prioridade', 'urgencia');
  CREATE TYPE "public"."enum_proposicoes_situacao_editorial" AS ENUM('triagem', 'ativa', 'monitorada', 'descartada');
  CREATE TYPE "public"."enum_proposicoes_origem" AS ENUM('api', 'manual');
  CREATE TYPE "public"."enum_pareceres_impacto" AS ENUM('alto', 'medio', 'baixo');
  CREATE TYPE "public"."enum_pareceres_carater" AS ENUM('malefico', 'enfraquece_indiretamente', 'neutro', 'benefico');
  CREATE TYPE "public"."enum_pareceres_status" AS ENUM('rascunho', 'em_revisao', 'agendado', 'publicado');
  CREATE TYPE "public"."enum__pareceres_v_version_impacto" AS ENUM('alto', 'medio', 'baixo');
  CREATE TYPE "public"."enum__pareceres_v_version_carater" AS ENUM('malefico', 'enfraquece_indiretamente', 'neutro', 'benefico');
  CREATE TYPE "public"."enum__pareceres_v_version_status" AS ENUM('rascunho', 'em_revisao', 'agendado', 'publicado');
  CREATE TYPE "public"."enum_compromissos_tipo" AS ENUM('parecer_prometido', 'atualizacao', 'correcao', 'credenciamento', 'lgpd');
  CREATE TYPE "public"."enum_compromissos_alvo" AS ENUM('proposicoes', 'pareceres', 'pedidos', 'credenciamentos');
  CREATE TYPE "public"."enum_compromissos_status" AS ENUM('aberto', 'suspenso', 'cumprido', 'retirado');
  CREATE TYPE "public"."enum_pedidos_tipo" AS ENUM('correcao', 'lgpd', 'outro');
  CREATE TYPE "public"."enum_pedidos_decisao" AS ENUM('pendente', 'procede', 'nao_procede', 'atendido');
  CREATE TYPE "public"."enum_tramitacoes_tipo_evento" AS ENUM('apresentacao', 'pauta', 'urgencia', 'parecer_relator', 'substitutivo', 'votacao', 'aprovacao', 'sancao', 'veto', 'arquivamento', 'outro');
  CREATE TYPE "public"."enum_versoes_tipo" AS ENUM('original', 'substitutivo', 'parecer_relator', 'emenda_aglutinativa', 'redacao_final', 'autografo', 'norma');
  CREATE TYPE "public"."enum_parlamentares_casa" AS ENUM('camara', 'senado', 'assembleia');
  CREATE TYPE "public"."enum_votos_voto" AS ENUM('sim', 'nao', 'abstencao', 'obstrucao', 'ausente', 'outro');
  CREATE TYPE "public"."enum_assinantes_perfil" AS ENUM('Advogado(a)', 'Estudante', 'Servidor(a) público(a)', 'Empresa', 'ONG / movimento', 'Pesquisador(a)', 'Jornalista', 'Cidadão(ã)');
  CREATE TYPE "public"."enum_credenciamentos_status" AS ENUM('em_analise', 'mais_info', 'verificado', 'recusado');
  CREATE TYPE "public"."enum_comunicados_perfis" AS ENUM('Advogado(a)', 'Estudante', 'Servidor(a) público(a)', 'Empresa', 'ONG / movimento', 'Pesquisador(a)', 'Jornalista', 'Cidadão(ã)');
  CREATE TYPE "public"."enum_comunicados_status" AS ENUM('rascunho', 'agendado', 'enviando', 'enviado');
  CREATE TYPE "public"."enum_envios_tipo" AS ENUM('acesso', 'aviso_publicacao', 'alerta', 'resumo', 'embargo', 'comunicado', 'resposta_pedido');
  CREATE TYPE "public"."enum_envios_status" AS ENUM('fila', 'enviado', 'entregue', 'retorno', 'erro');
  CREATE TYPE "public"."enum_fontes_nivel" AS ENUM('A', 'B', 'C', 'D');
  CREATE TYPE "public"."enum_fontes_esfera" AS ENUM('federal', 'estadual', 'municipal');
  CREATE TYPE "public"."enum_verificacoes_tipo" AS ENUM('fonte', 'site', 'paginas', 'email', 'backup', 'links', 'sitemap', 'compromissos');
  CREATE TYPE "public"."enum_verificacoes_resultado" AS ENUM('ok', 'alerta', 'falha');
  CREATE TYPE "public"."enum_materiais_tipo" AS ENUM('nota_tecnica', 'quadro_comparativo', 'outro');
  CREATE TYPE "public"."enum_materiais_visibilidade" AS ENUM('restrito', 'publico');
  CREATE TYPE "public"."enum_users_papel" AS ENUM('admin', 'autor', 'revisor');
  CREATE TABLE "proposicoes_autoria" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"parlamentar_id" integer,
  	"nome_livre" varchar,
  	"papel" "enum_proposicoes_autoria_papel" DEFAULT 'autor',
  	"orgao" varchar,
  	"data" timestamp(3) with time zone
  );
  
  CREATE TABLE "proposicoes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"sigla" varchar NOT NULL,
  	"numero" numeric NOT NULL,
  	"ano" numeric NOT NULL,
  	"rotulo" varchar,
  	"titulo" varchar,
  	"slug" varchar,
  	"esfera" "enum_proposicoes_esfera" DEFAULT 'federal' NOT NULL,
  	"uf" varchar,
  	"casa" "enum_proposicoes_casa",
  	"ementa" varchar,
  	"art1" varchar,
  	"status_simplificado" "enum_proposicoes_status_simplificado" DEFAULT 'em_tramitacao',
  	"status_oficial" varchar,
  	"etapa" varchar,
  	"regime" "enum_proposicoes_regime" DEFAULT 'normal',
  	"data_apresentacao" timestamp(3) with time zone,
  	"ultima_movimentacao" timestamp(3) with time zone,
  	"url_inteiro_teor" varchar,
  	"url_fonte" varchar,
  	"situacao_editorial" "enum_proposicoes_situacao_editorial" DEFAULT 'triagem' NOT NULL,
  	"prazo_parecer" timestamp(3) with time zone,
  	"ativada_em" timestamp(3) with time zone,
  	"relevancia" numeric,
  	"motivo_descarte" varchar,
  	"fonte_id" integer,
  	"chave_origem" varchar,
  	"origem" "enum_proposicoes_origem" DEFAULT 'manual',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "proposicoes_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "proposicoes_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"temas_id" integer,
  	"biomas_id" integer
  );
  
  CREATE TABLE "pareceres" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"titulo" varchar,
  	"proposicao_id" integer NOT NULL,
  	"secoes_resumo" jsonb,
  	"secoes_o_que_muda" jsonb,
  	"secoes_impactos" jsonb,
  	"secoes_pontos_atencao" jsonb,
  	"secoes_base_legal" jsonb,
  	"secoes_recomendacoes" jsonb,
  	"secoes_conclusao" jsonb,
  	"impacto" "enum_pareceres_impacto",
  	"carater" "enum_pareceres_carater",
  	"seo_palavra_chave" varchar,
  	"seo_nome_popular" varchar,
  	"seo_titulo_seo" varchar,
  	"seo_meta_descricao" varchar,
  	"seo_indexar" boolean DEFAULT true,
  	"materiais_nota_tecnica_id" integer,
  	"materiais_quadro_comparativo_id" integer,
  	"status" "enum_pareceres_status" DEFAULT 'rascunho' NOT NULL,
  	"agendado_para" timestamp(3) with time zone,
  	"embargo" boolean DEFAULT false,
  	"autor_id" integer,
  	"versao" numeric DEFAULT 1,
  	"versao_texto_id" integer,
  	"nota_da_versao" varchar,
  	"desatualizado_desde" timestamp(3) with time zone,
  	"publicado_em" timestamp(3) with time zone,
  	"atualizado_em" timestamp(3) with time zone,
  	"slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "pareceres_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "pareceres_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"temas_id" integer,
  	"biomas_id" integer
  );
  
  CREATE TABLE "_pareceres_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_titulo" varchar,
  	"version_proposicao_id" integer NOT NULL,
  	"version_secoes_resumo" jsonb,
  	"version_secoes_o_que_muda" jsonb,
  	"version_secoes_impactos" jsonb,
  	"version_secoes_pontos_atencao" jsonb,
  	"version_secoes_base_legal" jsonb,
  	"version_secoes_recomendacoes" jsonb,
  	"version_secoes_conclusao" jsonb,
  	"version_impacto" "enum__pareceres_v_version_impacto",
  	"version_carater" "enum__pareceres_v_version_carater",
  	"version_seo_palavra_chave" varchar,
  	"version_seo_nome_popular" varchar,
  	"version_seo_titulo_seo" varchar,
  	"version_seo_meta_descricao" varchar,
  	"version_seo_indexar" boolean DEFAULT true,
  	"version_materiais_nota_tecnica_id" integer,
  	"version_materiais_quadro_comparativo_id" integer,
  	"version_status" "enum__pareceres_v_version_status" DEFAULT 'rascunho' NOT NULL,
  	"version_agendado_para" timestamp(3) with time zone,
  	"version_embargo" boolean DEFAULT false,
  	"version_autor_id" integer,
  	"version_versao" numeric DEFAULT 1,
  	"version_versao_texto_id" integer,
  	"version_nota_da_versao" varchar,
  	"version_desatualizado_desde" timestamp(3) with time zone,
  	"version_publicado_em" timestamp(3) with time zone,
  	"version_atualizado_em" timestamp(3) with time zone,
  	"version_slug" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_pareceres_v_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "_pareceres_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"temas_id" integer,
  	"biomas_id" integer
  );
  
  CREATE TABLE "compromissos" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tipo" "enum_compromissos_tipo" NOT NULL,
  	"descricao" varchar NOT NULL,
  	"alvo" "enum_compromissos_alvo" NOT NULL,
  	"alvo_id" varchar NOT NULL,
  	"proposicao_id" integer,
  	"aberto_em" timestamp(3) with time zone NOT NULL,
  	"prazo_em" timestamp(3) with time zone NOT NULL,
  	"encerrado_em" timestamp(3) with time zone,
  	"status" "enum_compromissos_status" DEFAULT 'aberto' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "pedidos" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tipo" "enum_pedidos_tipo" NOT NULL,
  	"resumo" varchar,
  	"nome" varchar,
  	"email" varchar NOT NULL,
  	"parecer_id" integer,
  	"texto" varchar NOT NULL,
  	"decisao" "enum_pedidos_decisao" DEFAULT 'pendente',
  	"resposta" varchar,
  	"respondido_em" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "correcoes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parecer_id" integer NOT NULL,
  	"descricao" varchar NOT NULL,
  	"feita_em" timestamp(3) with time zone NOT NULL,
  	"pedido_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "tramitacoes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"proposicao_id" integer NOT NULL,
  	"data" timestamp(3) with time zone NOT NULL,
  	"orgao" varchar,
  	"descricao" varchar NOT NULL,
  	"tipo_evento" "enum_tramitacoes_tipo_evento" DEFAULT 'outro',
  	"chave_origem" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "versoes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"proposicao_id" integer NOT NULL,
  	"data" timestamp(3) with time zone NOT NULL,
  	"tipo" "enum_versoes_tipo" DEFAULT 'original',
  	"rotulo" varchar,
  	"url" varchar,
  	"texto" varchar,
  	"extraido_por_ocr" boolean DEFAULT false,
  	"hash" varchar,
  	"chave_origem" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "parlamentares" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nome" varchar NOT NULL,
  	"slug" varchar,
  	"partido" varchar,
  	"uf" varchar,
  	"casa" "enum_parlamentares_casa",
  	"foto_url" varchar,
  	"em_exercicio" boolean DEFAULT true,
  	"chave_origem" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "votacoes_orientacoes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"bancada" varchar,
  	"orientacao" varchar
  );
  
  CREATE TABLE "votacoes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"proposicao_id" integer NOT NULL,
  	"data" timestamp(3) with time zone NOT NULL,
  	"orgao" varchar,
  	"descricao" varchar,
  	"resultado" varchar,
  	"placar_sim" numeric,
  	"placar_nao" numeric,
  	"placar_abstencao" numeric,
  	"votos_nominais_publicados" boolean DEFAULT false,
  	"chave_origem" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "votos" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"votacao_id" integer NOT NULL,
  	"parlamentar_id" integer NOT NULL,
  	"voto" "enum_votos_voto" NOT NULL,
  	"chave" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "emendas" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"proposicao_id" integer NOT NULL,
  	"numero" varchar,
  	"parlamentar_id" integer,
  	"data" timestamp(3) with time zone,
  	"resumo" varchar,
  	"url" varchar,
  	"chave_origem" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "temas" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nome" varchar NOT NULL,
  	"slug" varchar,
  	"texto_abertura" varchar,
  	"revisar_em" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "biomas" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nome" varchar NOT NULL,
  	"slug" varchar,
  	"texto_abertura" varchar,
  	"revisar_em" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "biomas_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "palavras_chave" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"termo" varchar NOT NULL,
  	"grupo" varchar,
  	"peso" numeric DEFAULT 5 NOT NULL,
  	"exclusao" boolean DEFAULT false,
  	"uf" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "assinantes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nome" varchar,
  	"email" varchar NOT NULL,
  	"perfil" "enum_assinantes_perfil",
  	"subperfil" varchar,
  	"curso" varchar,
  	"uf" varchar,
  	"aceita_emails" boolean DEFAULT true,
  	"alertas" boolean DEFAULT true,
  	"resumo_semanal" boolean DEFAULT true,
  	"consentimento_em" timestamp(3) with time zone NOT NULL,
  	"confirmado_em" timestamp(3) with time zone,
  	"origem_proposicao_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "assinantes_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"temas_id" integer,
  	"biomas_id" integer,
  	"proposicoes_id" integer
  );
  
  CREATE TABLE "credenciamentos" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"assinante_id" integer NOT NULL,
  	"veiculo" varchar NOT NULL,
  	"tipo_veiculo" varchar,
  	"funcao" varchar,
  	"link_comprovacao" varchar NOT NULL,
  	"email_profissional" varchar,
  	"registro_mtb" varchar,
  	"autoriza_verificacao" boolean DEFAULT false NOT NULL,
  	"status" "enum_credenciamentos_status" DEFAULT 'em_analise',
  	"motivo" varchar,
  	"verificado_por_id" integer,
  	"verificado_em" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "comunicados_perfis" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_comunicados_perfis",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "comunicados" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"assunto" varchar NOT NULL,
  	"mensagem" varchar NOT NULL,
  	"uf" varchar,
  	"status" "enum_comunicados_status" DEFAULT 'rascunho',
  	"agendado_para" timestamp(3) with time zone,
  	"total_previsto" numeric,
  	"enviado_em" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "comunicados_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "envios" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tipo" "enum_envios_tipo" NOT NULL,
  	"assinante_id" integer,
  	"parecer_id" integer,
  	"comunicado_id" integer,
  	"status" "enum_envios_status" DEFAULT 'fila',
  	"erro" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "fontes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nome" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"conector" varchar,
  	"nivel" "enum_fontes_nivel",
  	"esfera" "enum_fontes_esfera",
  	"uf" varchar,
  	"frequencia" varchar DEFAULT '6h, 12h, 18h, 23h',
  	"manual" boolean DEFAULT false,
  	"ativa" boolean DEFAULT true,
  	"ultima_coleta" timestamp(3) with time zone,
  	"ultima_coleta_ok" timestamp(3) with time zone,
  	"itens_ultima_coleta" numeric,
  	"media_itens30d" numeric,
  	"erro" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "coletas" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"fonte_id" integer NOT NULL,
  	"inicio" timestamp(3) with time zone NOT NULL,
  	"fim" timestamp(3) with time zone,
  	"ok" boolean DEFAULT false,
  	"itens" numeric,
  	"erro" varchar,
  	"amostra" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "verificacoes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tipo" "enum_verificacoes_tipo" NOT NULL,
  	"resultado" "enum_verificacoes_resultado" NOT NULL,
  	"detalhe" varchar,
  	"dados" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "autores" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nome" varchar NOT NULL,
  	"slug" varchar,
  	"titulo" varchar,
  	"foto_id" integer,
  	"bio" varchar,
  	"redes_linkedin" varchar,
  	"redes_lattes" varchar,
  	"redes_instagram" varchar,
  	"redes_x" varchar,
  	"email_publico" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "materiais" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"titulo" varchar NOT NULL,
  	"tipo" "enum_materiais_tipo" NOT NULL,
  	"visibilidade" "enum_materiais_visibilidade" DEFAULT 'restrito',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nome" varchar,
  	"papel" "enum_users_papel" DEFAULT 'autor' NOT NULL,
  	"autor_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"proposicoes_id" integer,
  	"pareceres_id" integer,
  	"compromissos_id" integer,
  	"pedidos_id" integer,
  	"correcoes_id" integer,
  	"tramitacoes_id" integer,
  	"versoes_id" integer,
  	"parlamentares_id" integer,
  	"votacoes_id" integer,
  	"votos_id" integer,
  	"emendas_id" integer,
  	"temas_id" integer,
  	"biomas_id" integer,
  	"palavras_chave_id" integer,
  	"assinantes_id" integer,
  	"credenciamentos_id" integer,
  	"comunicados_id" integer,
  	"envios_id" integer,
  	"fontes_id" integer,
  	"coletas_id" integer,
  	"verificacoes_id" integer,
  	"autores_id" integer,
  	"media_id" integer,
  	"materiais_id" integer,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "ajustes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"prazos_parecer" numeric DEFAULT 7,
  	"prazos_atualizacao" numeric DEFAULT 5,
  	"prazos_correcao" numeric DEFAULT 3,
  	"prazos_credenciamento" numeric DEFAULT 2,
  	"prazos_lgpd" numeric DEFAULT 15,
  	"limite_prometidos" numeric DEFAULT 10,
  	"alertas_email" varchar,
  	"alertas_telegram_chat_id" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "proposicoes_autoria" ADD CONSTRAINT "proposicoes_autoria_parlamentar_id_parlamentares_id_fk" FOREIGN KEY ("parlamentar_id") REFERENCES "public"."parlamentares"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "proposicoes_autoria" ADD CONSTRAINT "proposicoes_autoria_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."proposicoes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "proposicoes" ADD CONSTRAINT "proposicoes_fonte_id_fontes_id_fk" FOREIGN KEY ("fonte_id") REFERENCES "public"."fontes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "proposicoes_texts" ADD CONSTRAINT "proposicoes_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."proposicoes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "proposicoes_rels" ADD CONSTRAINT "proposicoes_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."proposicoes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "proposicoes_rels" ADD CONSTRAINT "proposicoes_rels_temas_fk" FOREIGN KEY ("temas_id") REFERENCES "public"."temas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "proposicoes_rels" ADD CONSTRAINT "proposicoes_rels_biomas_fk" FOREIGN KEY ("biomas_id") REFERENCES "public"."biomas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pareceres" ADD CONSTRAINT "pareceres_proposicao_id_proposicoes_id_fk" FOREIGN KEY ("proposicao_id") REFERENCES "public"."proposicoes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pareceres" ADD CONSTRAINT "pareceres_materiais_nota_tecnica_id_materiais_id_fk" FOREIGN KEY ("materiais_nota_tecnica_id") REFERENCES "public"."materiais"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pareceres" ADD CONSTRAINT "pareceres_materiais_quadro_comparativo_id_materiais_id_fk" FOREIGN KEY ("materiais_quadro_comparativo_id") REFERENCES "public"."materiais"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pareceres" ADD CONSTRAINT "pareceres_autor_id_autores_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."autores"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pareceres" ADD CONSTRAINT "pareceres_versao_texto_id_versoes_id_fk" FOREIGN KEY ("versao_texto_id") REFERENCES "public"."versoes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pareceres_texts" ADD CONSTRAINT "pareceres_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pareceres"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pareceres_rels" ADD CONSTRAINT "pareceres_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pareceres"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pareceres_rels" ADD CONSTRAINT "pareceres_rels_temas_fk" FOREIGN KEY ("temas_id") REFERENCES "public"."temas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pareceres_rels" ADD CONSTRAINT "pareceres_rels_biomas_fk" FOREIGN KEY ("biomas_id") REFERENCES "public"."biomas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pareceres_v" ADD CONSTRAINT "_pareceres_v_parent_id_pareceres_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pareceres"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pareceres_v" ADD CONSTRAINT "_pareceres_v_version_proposicao_id_proposicoes_id_fk" FOREIGN KEY ("version_proposicao_id") REFERENCES "public"."proposicoes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pareceres_v" ADD CONSTRAINT "_pareceres_v_version_materiais_nota_tecnica_id_materiais_id_fk" FOREIGN KEY ("version_materiais_nota_tecnica_id") REFERENCES "public"."materiais"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pareceres_v" ADD CONSTRAINT "_pareceres_v_version_materiais_quadro_comparativo_id_materiais_id_fk" FOREIGN KEY ("version_materiais_quadro_comparativo_id") REFERENCES "public"."materiais"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pareceres_v" ADD CONSTRAINT "_pareceres_v_version_autor_id_autores_id_fk" FOREIGN KEY ("version_autor_id") REFERENCES "public"."autores"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pareceres_v" ADD CONSTRAINT "_pareceres_v_version_versao_texto_id_versoes_id_fk" FOREIGN KEY ("version_versao_texto_id") REFERENCES "public"."versoes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pareceres_v_texts" ADD CONSTRAINT "_pareceres_v_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_pareceres_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pareceres_v_rels" ADD CONSTRAINT "_pareceres_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_pareceres_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pareceres_v_rels" ADD CONSTRAINT "_pareceres_v_rels_temas_fk" FOREIGN KEY ("temas_id") REFERENCES "public"."temas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pareceres_v_rels" ADD CONSTRAINT "_pareceres_v_rels_biomas_fk" FOREIGN KEY ("biomas_id") REFERENCES "public"."biomas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "compromissos" ADD CONSTRAINT "compromissos_proposicao_id_proposicoes_id_fk" FOREIGN KEY ("proposicao_id") REFERENCES "public"."proposicoes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_parecer_id_pareceres_id_fk" FOREIGN KEY ("parecer_id") REFERENCES "public"."pareceres"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "correcoes" ADD CONSTRAINT "correcoes_parecer_id_pareceres_id_fk" FOREIGN KEY ("parecer_id") REFERENCES "public"."pareceres"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "correcoes" ADD CONSTRAINT "correcoes_pedido_id_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tramitacoes" ADD CONSTRAINT "tramitacoes_proposicao_id_proposicoes_id_fk" FOREIGN KEY ("proposicao_id") REFERENCES "public"."proposicoes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "versoes" ADD CONSTRAINT "versoes_proposicao_id_proposicoes_id_fk" FOREIGN KEY ("proposicao_id") REFERENCES "public"."proposicoes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "votacoes_orientacoes" ADD CONSTRAINT "votacoes_orientacoes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."votacoes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "votacoes" ADD CONSTRAINT "votacoes_proposicao_id_proposicoes_id_fk" FOREIGN KEY ("proposicao_id") REFERENCES "public"."proposicoes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "votos" ADD CONSTRAINT "votos_votacao_id_votacoes_id_fk" FOREIGN KEY ("votacao_id") REFERENCES "public"."votacoes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "votos" ADD CONSTRAINT "votos_parlamentar_id_parlamentares_id_fk" FOREIGN KEY ("parlamentar_id") REFERENCES "public"."parlamentares"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "emendas" ADD CONSTRAINT "emendas_proposicao_id_proposicoes_id_fk" FOREIGN KEY ("proposicao_id") REFERENCES "public"."proposicoes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "emendas" ADD CONSTRAINT "emendas_parlamentar_id_parlamentares_id_fk" FOREIGN KEY ("parlamentar_id") REFERENCES "public"."parlamentares"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "biomas_texts" ADD CONSTRAINT "biomas_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."biomas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "assinantes" ADD CONSTRAINT "assinantes_origem_proposicao_id_proposicoes_id_fk" FOREIGN KEY ("origem_proposicao_id") REFERENCES "public"."proposicoes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "assinantes_rels" ADD CONSTRAINT "assinantes_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."assinantes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "assinantes_rels" ADD CONSTRAINT "assinantes_rels_temas_fk" FOREIGN KEY ("temas_id") REFERENCES "public"."temas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "assinantes_rels" ADD CONSTRAINT "assinantes_rels_biomas_fk" FOREIGN KEY ("biomas_id") REFERENCES "public"."biomas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "assinantes_rels" ADD CONSTRAINT "assinantes_rels_proposicoes_fk" FOREIGN KEY ("proposicoes_id") REFERENCES "public"."proposicoes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "credenciamentos" ADD CONSTRAINT "credenciamentos_assinante_id_assinantes_id_fk" FOREIGN KEY ("assinante_id") REFERENCES "public"."assinantes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "credenciamentos" ADD CONSTRAINT "credenciamentos_verificado_por_id_users_id_fk" FOREIGN KEY ("verificado_por_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "comunicados_perfis" ADD CONSTRAINT "comunicados_perfis_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."comunicados"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "comunicados_texts" ADD CONSTRAINT "comunicados_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."comunicados"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "envios" ADD CONSTRAINT "envios_assinante_id_assinantes_id_fk" FOREIGN KEY ("assinante_id") REFERENCES "public"."assinantes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "envios" ADD CONSTRAINT "envios_parecer_id_pareceres_id_fk" FOREIGN KEY ("parecer_id") REFERENCES "public"."pareceres"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "envios" ADD CONSTRAINT "envios_comunicado_id_comunicados_id_fk" FOREIGN KEY ("comunicado_id") REFERENCES "public"."comunicados"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "coletas" ADD CONSTRAINT "coletas_fonte_id_fontes_id_fk" FOREIGN KEY ("fonte_id") REFERENCES "public"."fontes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "autores" ADD CONSTRAINT "autores_foto_id_media_id_fk" FOREIGN KEY ("foto_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users" ADD CONSTRAINT "users_autor_id_autores_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."autores"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_proposicoes_fk" FOREIGN KEY ("proposicoes_id") REFERENCES "public"."proposicoes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pareceres_fk" FOREIGN KEY ("pareceres_id") REFERENCES "public"."pareceres"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_compromissos_fk" FOREIGN KEY ("compromissos_id") REFERENCES "public"."compromissos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pedidos_fk" FOREIGN KEY ("pedidos_id") REFERENCES "public"."pedidos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_correcoes_fk" FOREIGN KEY ("correcoes_id") REFERENCES "public"."correcoes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tramitacoes_fk" FOREIGN KEY ("tramitacoes_id") REFERENCES "public"."tramitacoes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_versoes_fk" FOREIGN KEY ("versoes_id") REFERENCES "public"."versoes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parlamentares_fk" FOREIGN KEY ("parlamentares_id") REFERENCES "public"."parlamentares"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_votacoes_fk" FOREIGN KEY ("votacoes_id") REFERENCES "public"."votacoes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_votos_fk" FOREIGN KEY ("votos_id") REFERENCES "public"."votos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_emendas_fk" FOREIGN KEY ("emendas_id") REFERENCES "public"."emendas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_temas_fk" FOREIGN KEY ("temas_id") REFERENCES "public"."temas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_biomas_fk" FOREIGN KEY ("biomas_id") REFERENCES "public"."biomas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_palavras_chave_fk" FOREIGN KEY ("palavras_chave_id") REFERENCES "public"."palavras_chave"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_assinantes_fk" FOREIGN KEY ("assinantes_id") REFERENCES "public"."assinantes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_credenciamentos_fk" FOREIGN KEY ("credenciamentos_id") REFERENCES "public"."credenciamentos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_comunicados_fk" FOREIGN KEY ("comunicados_id") REFERENCES "public"."comunicados"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_envios_fk" FOREIGN KEY ("envios_id") REFERENCES "public"."envios"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_fontes_fk" FOREIGN KEY ("fontes_id") REFERENCES "public"."fontes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_coletas_fk" FOREIGN KEY ("coletas_id") REFERENCES "public"."coletas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_verificacoes_fk" FOREIGN KEY ("verificacoes_id") REFERENCES "public"."verificacoes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_autores_fk" FOREIGN KEY ("autores_id") REFERENCES "public"."autores"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_materiais_fk" FOREIGN KEY ("materiais_id") REFERENCES "public"."materiais"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "proposicoes_autoria_order_idx" ON "proposicoes_autoria" USING btree ("_order");
  CREATE INDEX "proposicoes_autoria_parent_id_idx" ON "proposicoes_autoria" USING btree ("_parent_id");
  CREATE INDEX "proposicoes_autoria_parlamentar_idx" ON "proposicoes_autoria" USING btree ("parlamentar_id");
  CREATE INDEX "proposicoes_rotulo_idx" ON "proposicoes" USING btree ("rotulo");
  CREATE UNIQUE INDEX "proposicoes_slug_idx" ON "proposicoes" USING btree ("slug");
  CREATE INDEX "proposicoes_fonte_idx" ON "proposicoes" USING btree ("fonte_id");
  CREATE UNIQUE INDEX "proposicoes_chave_origem_idx" ON "proposicoes" USING btree ("chave_origem");
  CREATE INDEX "proposicoes_updated_at_idx" ON "proposicoes" USING btree ("updated_at");
  CREATE INDEX "proposicoes_created_at_idx" ON "proposicoes" USING btree ("created_at");
  CREATE INDEX "proposicoes_texts_order_parent" ON "proposicoes_texts" USING btree ("order","parent_id");
  CREATE INDEX "proposicoes_rels_order_idx" ON "proposicoes_rels" USING btree ("order");
  CREATE INDEX "proposicoes_rels_parent_idx" ON "proposicoes_rels" USING btree ("parent_id");
  CREATE INDEX "proposicoes_rels_path_idx" ON "proposicoes_rels" USING btree ("path");
  CREATE INDEX "proposicoes_rels_temas_id_idx" ON "proposicoes_rels" USING btree ("temas_id");
  CREATE INDEX "proposicoes_rels_biomas_id_idx" ON "proposicoes_rels" USING btree ("biomas_id");
  CREATE UNIQUE INDEX "pareceres_proposicao_idx" ON "pareceres" USING btree ("proposicao_id");
  CREATE INDEX "pareceres_materiais_materiais_nota_tecnica_idx" ON "pareceres" USING btree ("materiais_nota_tecnica_id");
  CREATE INDEX "pareceres_materiais_materiais_quadro_comparativo_idx" ON "pareceres" USING btree ("materiais_quadro_comparativo_id");
  CREATE INDEX "pareceres_autor_idx" ON "pareceres" USING btree ("autor_id");
  CREATE INDEX "pareceres_versao_texto_idx" ON "pareceres" USING btree ("versao_texto_id");
  CREATE UNIQUE INDEX "pareceres_slug_idx" ON "pareceres" USING btree ("slug");
  CREATE INDEX "pareceres_updated_at_idx" ON "pareceres" USING btree ("updated_at");
  CREATE INDEX "pareceres_created_at_idx" ON "pareceres" USING btree ("created_at");
  CREATE INDEX "pareceres_texts_order_parent" ON "pareceres_texts" USING btree ("order","parent_id");
  CREATE INDEX "pareceres_rels_order_idx" ON "pareceres_rels" USING btree ("order");
  CREATE INDEX "pareceres_rels_parent_idx" ON "pareceres_rels" USING btree ("parent_id");
  CREATE INDEX "pareceres_rels_path_idx" ON "pareceres_rels" USING btree ("path");
  CREATE INDEX "pareceres_rels_temas_id_idx" ON "pareceres_rels" USING btree ("temas_id");
  CREATE INDEX "pareceres_rels_biomas_id_idx" ON "pareceres_rels" USING btree ("biomas_id");
  CREATE INDEX "_pareceres_v_parent_idx" ON "_pareceres_v" USING btree ("parent_id");
  CREATE INDEX "_pareceres_v_version_version_proposicao_idx" ON "_pareceres_v" USING btree ("version_proposicao_id");
  CREATE INDEX "_pareceres_v_version_materiais_version_materiais_nota_te_idx" ON "_pareceres_v" USING btree ("version_materiais_nota_tecnica_id");
  CREATE INDEX "_pareceres_v_version_materiais_version_materiais_quadro__idx" ON "_pareceres_v" USING btree ("version_materiais_quadro_comparativo_id");
  CREATE INDEX "_pareceres_v_version_version_autor_idx" ON "_pareceres_v" USING btree ("version_autor_id");
  CREATE INDEX "_pareceres_v_version_version_versao_texto_idx" ON "_pareceres_v" USING btree ("version_versao_texto_id");
  CREATE INDEX "_pareceres_v_version_version_slug_idx" ON "_pareceres_v" USING btree ("version_slug");
  CREATE INDEX "_pareceres_v_version_version_updated_at_idx" ON "_pareceres_v" USING btree ("version_updated_at");
  CREATE INDEX "_pareceres_v_version_version_created_at_idx" ON "_pareceres_v" USING btree ("version_created_at");
  CREATE INDEX "_pareceres_v_created_at_idx" ON "_pareceres_v" USING btree ("created_at");
  CREATE INDEX "_pareceres_v_updated_at_idx" ON "_pareceres_v" USING btree ("updated_at");
  CREATE INDEX "_pareceres_v_texts_order_parent" ON "_pareceres_v_texts" USING btree ("order","parent_id");
  CREATE INDEX "_pareceres_v_rels_order_idx" ON "_pareceres_v_rels" USING btree ("order");
  CREATE INDEX "_pareceres_v_rels_parent_idx" ON "_pareceres_v_rels" USING btree ("parent_id");
  CREATE INDEX "_pareceres_v_rels_path_idx" ON "_pareceres_v_rels" USING btree ("path");
  CREATE INDEX "_pareceres_v_rels_temas_id_idx" ON "_pareceres_v_rels" USING btree ("temas_id");
  CREATE INDEX "_pareceres_v_rels_biomas_id_idx" ON "_pareceres_v_rels" USING btree ("biomas_id");
  CREATE INDEX "compromissos_alvo_id_idx" ON "compromissos" USING btree ("alvo_id");
  CREATE INDEX "compromissos_proposicao_idx" ON "compromissos" USING btree ("proposicao_id");
  CREATE INDEX "compromissos_prazo_em_idx" ON "compromissos" USING btree ("prazo_em");
  CREATE INDEX "compromissos_status_idx" ON "compromissos" USING btree ("status");
  CREATE INDEX "compromissos_updated_at_idx" ON "compromissos" USING btree ("updated_at");
  CREATE INDEX "compromissos_created_at_idx" ON "compromissos" USING btree ("created_at");
  CREATE INDEX "pedidos_parecer_idx" ON "pedidos" USING btree ("parecer_id");
  CREATE INDEX "pedidos_updated_at_idx" ON "pedidos" USING btree ("updated_at");
  CREATE INDEX "pedidos_created_at_idx" ON "pedidos" USING btree ("created_at");
  CREATE INDEX "correcoes_parecer_idx" ON "correcoes" USING btree ("parecer_id");
  CREATE INDEX "correcoes_pedido_idx" ON "correcoes" USING btree ("pedido_id");
  CREATE INDEX "correcoes_updated_at_idx" ON "correcoes" USING btree ("updated_at");
  CREATE INDEX "correcoes_created_at_idx" ON "correcoes" USING btree ("created_at");
  CREATE INDEX "tramitacoes_proposicao_idx" ON "tramitacoes" USING btree ("proposicao_id");
  CREATE INDEX "tramitacoes_data_idx" ON "tramitacoes" USING btree ("data");
  CREATE UNIQUE INDEX "tramitacoes_chave_origem_idx" ON "tramitacoes" USING btree ("chave_origem");
  CREATE INDEX "tramitacoes_updated_at_idx" ON "tramitacoes" USING btree ("updated_at");
  CREATE INDEX "tramitacoes_created_at_idx" ON "tramitacoes" USING btree ("created_at");
  CREATE INDEX "versoes_proposicao_idx" ON "versoes" USING btree ("proposicao_id");
  CREATE INDEX "versoes_hash_idx" ON "versoes" USING btree ("hash");
  CREATE UNIQUE INDEX "versoes_chave_origem_idx" ON "versoes" USING btree ("chave_origem");
  CREATE INDEX "versoes_updated_at_idx" ON "versoes" USING btree ("updated_at");
  CREATE INDEX "versoes_created_at_idx" ON "versoes" USING btree ("created_at");
  CREATE UNIQUE INDEX "parlamentares_slug_idx" ON "parlamentares" USING btree ("slug");
  CREATE UNIQUE INDEX "parlamentares_chave_origem_idx" ON "parlamentares" USING btree ("chave_origem");
  CREATE INDEX "parlamentares_updated_at_idx" ON "parlamentares" USING btree ("updated_at");
  CREATE INDEX "parlamentares_created_at_idx" ON "parlamentares" USING btree ("created_at");
  CREATE INDEX "votacoes_orientacoes_order_idx" ON "votacoes_orientacoes" USING btree ("_order");
  CREATE INDEX "votacoes_orientacoes_parent_id_idx" ON "votacoes_orientacoes" USING btree ("_parent_id");
  CREATE INDEX "votacoes_proposicao_idx" ON "votacoes" USING btree ("proposicao_id");
  CREATE UNIQUE INDEX "votacoes_chave_origem_idx" ON "votacoes" USING btree ("chave_origem");
  CREATE INDEX "votacoes_updated_at_idx" ON "votacoes" USING btree ("updated_at");
  CREATE INDEX "votacoes_created_at_idx" ON "votacoes" USING btree ("created_at");
  CREATE INDEX "votos_votacao_idx" ON "votos" USING btree ("votacao_id");
  CREATE INDEX "votos_parlamentar_idx" ON "votos" USING btree ("parlamentar_id");
  CREATE UNIQUE INDEX "votos_chave_idx" ON "votos" USING btree ("chave");
  CREATE INDEX "votos_updated_at_idx" ON "votos" USING btree ("updated_at");
  CREATE INDEX "votos_created_at_idx" ON "votos" USING btree ("created_at");
  CREATE INDEX "emendas_proposicao_idx" ON "emendas" USING btree ("proposicao_id");
  CREATE INDEX "emendas_parlamentar_idx" ON "emendas" USING btree ("parlamentar_id");
  CREATE UNIQUE INDEX "emendas_chave_origem_idx" ON "emendas" USING btree ("chave_origem");
  CREATE INDEX "emendas_updated_at_idx" ON "emendas" USING btree ("updated_at");
  CREATE INDEX "emendas_created_at_idx" ON "emendas" USING btree ("created_at");
  CREATE UNIQUE INDEX "temas_slug_idx" ON "temas" USING btree ("slug");
  CREATE INDEX "temas_updated_at_idx" ON "temas" USING btree ("updated_at");
  CREATE INDEX "temas_created_at_idx" ON "temas" USING btree ("created_at");
  CREATE UNIQUE INDEX "biomas_slug_idx" ON "biomas" USING btree ("slug");
  CREATE INDEX "biomas_updated_at_idx" ON "biomas" USING btree ("updated_at");
  CREATE INDEX "biomas_created_at_idx" ON "biomas" USING btree ("created_at");
  CREATE INDEX "biomas_texts_order_parent" ON "biomas_texts" USING btree ("order","parent_id");
  CREATE UNIQUE INDEX "palavras_chave_termo_idx" ON "palavras_chave" USING btree ("termo");
  CREATE INDEX "palavras_chave_updated_at_idx" ON "palavras_chave" USING btree ("updated_at");
  CREATE INDEX "palavras_chave_created_at_idx" ON "palavras_chave" USING btree ("created_at");
  CREATE UNIQUE INDEX "assinantes_email_idx" ON "assinantes" USING btree ("email");
  CREATE INDEX "assinantes_origem_proposicao_idx" ON "assinantes" USING btree ("origem_proposicao_id");
  CREATE INDEX "assinantes_updated_at_idx" ON "assinantes" USING btree ("updated_at");
  CREATE INDEX "assinantes_created_at_idx" ON "assinantes" USING btree ("created_at");
  CREATE INDEX "assinantes_rels_order_idx" ON "assinantes_rels" USING btree ("order");
  CREATE INDEX "assinantes_rels_parent_idx" ON "assinantes_rels" USING btree ("parent_id");
  CREATE INDEX "assinantes_rels_path_idx" ON "assinantes_rels" USING btree ("path");
  CREATE INDEX "assinantes_rels_temas_id_idx" ON "assinantes_rels" USING btree ("temas_id");
  CREATE INDEX "assinantes_rels_biomas_id_idx" ON "assinantes_rels" USING btree ("biomas_id");
  CREATE INDEX "assinantes_rels_proposicoes_id_idx" ON "assinantes_rels" USING btree ("proposicoes_id");
  CREATE INDEX "credenciamentos_assinante_idx" ON "credenciamentos" USING btree ("assinante_id");
  CREATE INDEX "credenciamentos_verificado_por_idx" ON "credenciamentos" USING btree ("verificado_por_id");
  CREATE INDEX "credenciamentos_updated_at_idx" ON "credenciamentos" USING btree ("updated_at");
  CREATE INDEX "credenciamentos_created_at_idx" ON "credenciamentos" USING btree ("created_at");
  CREATE INDEX "comunicados_perfis_order_idx" ON "comunicados_perfis" USING btree ("order");
  CREATE INDEX "comunicados_perfis_parent_idx" ON "comunicados_perfis" USING btree ("parent_id");
  CREATE INDEX "comunicados_updated_at_idx" ON "comunicados" USING btree ("updated_at");
  CREATE INDEX "comunicados_created_at_idx" ON "comunicados" USING btree ("created_at");
  CREATE INDEX "comunicados_texts_order_parent" ON "comunicados_texts" USING btree ("order","parent_id");
  CREATE INDEX "envios_assinante_idx" ON "envios" USING btree ("assinante_id");
  CREATE INDEX "envios_parecer_idx" ON "envios" USING btree ("parecer_id");
  CREATE INDEX "envios_comunicado_idx" ON "envios" USING btree ("comunicado_id");
  CREATE INDEX "envios_updated_at_idx" ON "envios" USING btree ("updated_at");
  CREATE INDEX "envios_created_at_idx" ON "envios" USING btree ("created_at");
  CREATE UNIQUE INDEX "fontes_slug_idx" ON "fontes" USING btree ("slug");
  CREATE INDEX "fontes_updated_at_idx" ON "fontes" USING btree ("updated_at");
  CREATE INDEX "fontes_created_at_idx" ON "fontes" USING btree ("created_at");
  CREATE INDEX "coletas_fonte_idx" ON "coletas" USING btree ("fonte_id");
  CREATE INDEX "coletas_updated_at_idx" ON "coletas" USING btree ("updated_at");
  CREATE INDEX "coletas_created_at_idx" ON "coletas" USING btree ("created_at");
  CREATE INDEX "verificacoes_updated_at_idx" ON "verificacoes" USING btree ("updated_at");
  CREATE INDEX "verificacoes_created_at_idx" ON "verificacoes" USING btree ("created_at");
  CREATE UNIQUE INDEX "autores_slug_idx" ON "autores" USING btree ("slug");
  CREATE INDEX "autores_foto_idx" ON "autores" USING btree ("foto_id");
  CREATE INDEX "autores_updated_at_idx" ON "autores" USING btree ("updated_at");
  CREATE INDEX "autores_created_at_idx" ON "autores" USING btree ("created_at");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "materiais_updated_at_idx" ON "materiais" USING btree ("updated_at");
  CREATE INDEX "materiais_created_at_idx" ON "materiais" USING btree ("created_at");
  CREATE UNIQUE INDEX "materiais_filename_idx" ON "materiais" USING btree ("filename");
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_autor_idx" ON "users" USING btree ("autor_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_proposicoes_id_idx" ON "payload_locked_documents_rels" USING btree ("proposicoes_id");
  CREATE INDEX "payload_locked_documents_rels_pareceres_id_idx" ON "payload_locked_documents_rels" USING btree ("pareceres_id");
  CREATE INDEX "payload_locked_documents_rels_compromissos_id_idx" ON "payload_locked_documents_rels" USING btree ("compromissos_id");
  CREATE INDEX "payload_locked_documents_rels_pedidos_id_idx" ON "payload_locked_documents_rels" USING btree ("pedidos_id");
  CREATE INDEX "payload_locked_documents_rels_correcoes_id_idx" ON "payload_locked_documents_rels" USING btree ("correcoes_id");
  CREATE INDEX "payload_locked_documents_rels_tramitacoes_id_idx" ON "payload_locked_documents_rels" USING btree ("tramitacoes_id");
  CREATE INDEX "payload_locked_documents_rels_versoes_id_idx" ON "payload_locked_documents_rels" USING btree ("versoes_id");
  CREATE INDEX "payload_locked_documents_rels_parlamentares_id_idx" ON "payload_locked_documents_rels" USING btree ("parlamentares_id");
  CREATE INDEX "payload_locked_documents_rels_votacoes_id_idx" ON "payload_locked_documents_rels" USING btree ("votacoes_id");
  CREATE INDEX "payload_locked_documents_rels_votos_id_idx" ON "payload_locked_documents_rels" USING btree ("votos_id");
  CREATE INDEX "payload_locked_documents_rels_emendas_id_idx" ON "payload_locked_documents_rels" USING btree ("emendas_id");
  CREATE INDEX "payload_locked_documents_rels_temas_id_idx" ON "payload_locked_documents_rels" USING btree ("temas_id");
  CREATE INDEX "payload_locked_documents_rels_biomas_id_idx" ON "payload_locked_documents_rels" USING btree ("biomas_id");
  CREATE INDEX "payload_locked_documents_rels_palavras_chave_id_idx" ON "payload_locked_documents_rels" USING btree ("palavras_chave_id");
  CREATE INDEX "payload_locked_documents_rels_assinantes_id_idx" ON "payload_locked_documents_rels" USING btree ("assinantes_id");
  CREATE INDEX "payload_locked_documents_rels_credenciamentos_id_idx" ON "payload_locked_documents_rels" USING btree ("credenciamentos_id");
  CREATE INDEX "payload_locked_documents_rels_comunicados_id_idx" ON "payload_locked_documents_rels" USING btree ("comunicados_id");
  CREATE INDEX "payload_locked_documents_rels_envios_id_idx" ON "payload_locked_documents_rels" USING btree ("envios_id");
  CREATE INDEX "payload_locked_documents_rels_fontes_id_idx" ON "payload_locked_documents_rels" USING btree ("fontes_id");
  CREATE INDEX "payload_locked_documents_rels_coletas_id_idx" ON "payload_locked_documents_rels" USING btree ("coletas_id");
  CREATE INDEX "payload_locked_documents_rels_verificacoes_id_idx" ON "payload_locked_documents_rels" USING btree ("verificacoes_id");
  CREATE INDEX "payload_locked_documents_rels_autores_id_idx" ON "payload_locked_documents_rels" USING btree ("autores_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_materiais_id_idx" ON "payload_locked_documents_rels" USING btree ("materiais_id");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "proposicoes_autoria" CASCADE;
  DROP TABLE "proposicoes" CASCADE;
  DROP TABLE "proposicoes_texts" CASCADE;
  DROP TABLE "proposicoes_rels" CASCADE;
  DROP TABLE "pareceres" CASCADE;
  DROP TABLE "pareceres_texts" CASCADE;
  DROP TABLE "pareceres_rels" CASCADE;
  DROP TABLE "_pareceres_v" CASCADE;
  DROP TABLE "_pareceres_v_texts" CASCADE;
  DROP TABLE "_pareceres_v_rels" CASCADE;
  DROP TABLE "compromissos" CASCADE;
  DROP TABLE "pedidos" CASCADE;
  DROP TABLE "correcoes" CASCADE;
  DROP TABLE "tramitacoes" CASCADE;
  DROP TABLE "versoes" CASCADE;
  DROP TABLE "parlamentares" CASCADE;
  DROP TABLE "votacoes_orientacoes" CASCADE;
  DROP TABLE "votacoes" CASCADE;
  DROP TABLE "votos" CASCADE;
  DROP TABLE "emendas" CASCADE;
  DROP TABLE "temas" CASCADE;
  DROP TABLE "biomas" CASCADE;
  DROP TABLE "biomas_texts" CASCADE;
  DROP TABLE "palavras_chave" CASCADE;
  DROP TABLE "assinantes" CASCADE;
  DROP TABLE "assinantes_rels" CASCADE;
  DROP TABLE "credenciamentos" CASCADE;
  DROP TABLE "comunicados_perfis" CASCADE;
  DROP TABLE "comunicados" CASCADE;
  DROP TABLE "comunicados_texts" CASCADE;
  DROP TABLE "envios" CASCADE;
  DROP TABLE "fontes" CASCADE;
  DROP TABLE "coletas" CASCADE;
  DROP TABLE "verificacoes" CASCADE;
  DROP TABLE "autores" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "materiais" CASCADE;
  DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "ajustes" CASCADE;
  DROP TYPE "public"."enum_proposicoes_autoria_papel";
  DROP TYPE "public"."enum_proposicoes_esfera";
  DROP TYPE "public"."enum_proposicoes_casa";
  DROP TYPE "public"."enum_proposicoes_status_simplificado";
  DROP TYPE "public"."enum_proposicoes_regime";
  DROP TYPE "public"."enum_proposicoes_situacao_editorial";
  DROP TYPE "public"."enum_proposicoes_origem";
  DROP TYPE "public"."enum_pareceres_impacto";
  DROP TYPE "public"."enum_pareceres_carater";
  DROP TYPE "public"."enum_pareceres_status";
  DROP TYPE "public"."enum__pareceres_v_version_impacto";
  DROP TYPE "public"."enum__pareceres_v_version_carater";
  DROP TYPE "public"."enum__pareceres_v_version_status";
  DROP TYPE "public"."enum_compromissos_tipo";
  DROP TYPE "public"."enum_compromissos_alvo";
  DROP TYPE "public"."enum_compromissos_status";
  DROP TYPE "public"."enum_pedidos_tipo";
  DROP TYPE "public"."enum_pedidos_decisao";
  DROP TYPE "public"."enum_tramitacoes_tipo_evento";
  DROP TYPE "public"."enum_versoes_tipo";
  DROP TYPE "public"."enum_parlamentares_casa";
  DROP TYPE "public"."enum_votos_voto";
  DROP TYPE "public"."enum_assinantes_perfil";
  DROP TYPE "public"."enum_credenciamentos_status";
  DROP TYPE "public"."enum_comunicados_perfis";
  DROP TYPE "public"."enum_comunicados_status";
  DROP TYPE "public"."enum_envios_tipo";
  DROP TYPE "public"."enum_envios_status";
  DROP TYPE "public"."enum_fontes_nivel";
  DROP TYPE "public"."enum_fontes_esfera";
  DROP TYPE "public"."enum_verificacoes_tipo";
  DROP TYPE "public"."enum_verificacoes_resultado";
  DROP TYPE "public"."enum_materiais_tipo";
  DROP TYPE "public"."enum_materiais_visibilidade";
  DROP TYPE "public"."enum_users_papel";`)
}
