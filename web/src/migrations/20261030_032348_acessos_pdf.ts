import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_acessos_pdf_material" AS ENUM('nota_tecnica', 'quadro_comparativo', 'outro');
  CREATE TABLE "acessos_pdf" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parecer_id" integer NOT NULL,
  	"material" "enum_acessos_pdf_material" NOT NULL,
  	"versao_pdf" numeric NOT NULL,
  	"em" timestamp(3) with time zone NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "acessos_pdf_id" integer;
  ALTER TABLE "acessos_pdf" ADD CONSTRAINT "acessos_pdf_parecer_id_pareceres_id_fk" FOREIGN KEY ("parecer_id") REFERENCES "public"."pareceres"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "acessos_pdf_parecer_idx" ON "acessos_pdf" USING btree ("parecer_id");
  CREATE INDEX "acessos_pdf_em_idx" ON "acessos_pdf" USING btree ("em");
  CREATE INDEX "acessos_pdf_updated_at_idx" ON "acessos_pdf" USING btree ("updated_at");
  CREATE INDEX "acessos_pdf_created_at_idx" ON "acessos_pdf" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_acessos_pdf_fk" FOREIGN KEY ("acessos_pdf_id") REFERENCES "public"."acessos_pdf"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_acessos_pdf_id_idx" ON "payload_locked_documents_rels" USING btree ("acessos_pdf_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_acessos_pdf_fk";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_acessos_pdf_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "acessos_pdf_id";
  DROP TABLE "acessos_pdf" CASCADE;
  DROP TYPE "public"."enum_acessos_pdf_material";`)
}
