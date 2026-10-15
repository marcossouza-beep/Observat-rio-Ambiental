import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_alertas_tipo" AS ENUM('pauta', 'urgencia', 'substitutivo', 'votacao', 'aprovacao', 'sancao', 'veto', 'nova_versao', 'situacao');
  CREATE TABLE "alertas" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"proposicao_id" integer NOT NULL,
  	"tipo" "enum_alertas_tipo" NOT NULL,
  	"titulo" varchar NOT NULL,
  	"data" timestamp(3) with time zone NOT NULL,
  	"link" varchar,
  	"visto" boolean DEFAULT false,
  	"chave" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "tramitacoes" ADD COLUMN "url_documento" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "alertas_id" integer;
  ALTER TABLE "ajustes" ADD COLUMN "coleta_nota_minima" numeric DEFAULT 40;
  ALTER TABLE "ajustes" ADD COLUMN "coleta_max_novas" numeric DEFAULT 40;
  ALTER TABLE "alertas" ADD CONSTRAINT "alertas_proposicao_id_proposicoes_id_fk" FOREIGN KEY ("proposicao_id") REFERENCES "public"."proposicoes"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "alertas_proposicao_idx" ON "alertas" USING btree ("proposicao_id");
  CREATE INDEX "alertas_tipo_idx" ON "alertas" USING btree ("tipo");
  CREATE INDEX "alertas_data_idx" ON "alertas" USING btree ("data");
  CREATE INDEX "alertas_visto_idx" ON "alertas" USING btree ("visto");
  CREATE UNIQUE INDEX "alertas_chave_idx" ON "alertas" USING btree ("chave");
  CREATE INDEX "alertas_updated_at_idx" ON "alertas" USING btree ("updated_at");
  CREATE INDEX "alertas_created_at_idx" ON "alertas" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_alertas_fk" FOREIGN KEY ("alertas_id") REFERENCES "public"."alertas"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "proposicoes_texts_text_idx" ON "proposicoes_texts" USING btree ("text");
  CREATE INDEX "payload_locked_documents_rels_alertas_id_idx" ON "payload_locked_documents_rels" USING btree ("alertas_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "alertas" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "alertas" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_alertas_fk";
  
  DROP INDEX "proposicoes_texts_text_idx";
  DROP INDEX "payload_locked_documents_rels_alertas_id_idx";
  ALTER TABLE "tramitacoes" DROP COLUMN "url_documento";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "alertas_id";
  ALTER TABLE "ajustes" DROP COLUMN "coleta_nota_minima";
  ALTER TABLE "ajustes" DROP COLUMN "coleta_max_novas";
  DROP TYPE "public"."enum_alertas_tipo";`)
}
