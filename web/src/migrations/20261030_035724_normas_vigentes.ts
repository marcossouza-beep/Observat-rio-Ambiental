import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_normas_vigentes_origem" AS ENUM('coleta', 'manual');
  CREATE TABLE "normas_vigentes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"chave" varchar NOT NULL,
  	"rotulo" varchar NOT NULL,
  	"nome_popular" varchar,
  	"url" varchar,
  	"texto" varchar,
  	"origem" "enum_normas_vigentes_origem" DEFAULT 'manual',
  	"atualizado_em" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "normas_vigentes_id" integer;
  CREATE UNIQUE INDEX "normas_vigentes_chave_idx" ON "normas_vigentes" USING btree ("chave");
  CREATE INDEX "normas_vigentes_updated_at_idx" ON "normas_vigentes" USING btree ("updated_at");
  CREATE INDEX "normas_vigentes_created_at_idx" ON "normas_vigentes" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_normas_vigentes_fk" FOREIGN KEY ("normas_vigentes_id") REFERENCES "public"."normas_vigentes"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_normas_vigentes_id_idx" ON "payload_locked_documents_rels" USING btree ("normas_vigentes_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_normas_vigentes_fk";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_normas_vigentes_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "normas_vigentes_id";
  DROP TABLE "normas_vigentes" CASCADE;
  DROP TYPE "public"."enum_normas_vigentes_origem";`)
}
