import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "emails_automaticos" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"resumo_nota" varchar,
  	"resumo_pular" boolean DEFAULT false,
  	"resumo_ultimo_envio" timestamp(3) with time zone,
  	"resumo_ultimo_total" numeric,
  	"alertas_ultimo_envio" timestamp(3) with time zone,
  	"alertas_ultimo_total" numeric,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "assinantes" ALTER COLUMN "alertas" SET DEFAULT false;
  ALTER TABLE "assinantes" ALTER COLUMN "resumo_semanal" SET DEFAULT false;
  -- Alerta diário e resumo semanal passam a ser escolha explícita: quem se inscreveu antes nunca viu essas opções.
  UPDATE "assinantes" SET "alertas" = false, "resumo_semanal" = false;
  ALTER TABLE "assinantes_rels" ADD COLUMN "parlamentares_id" integer;
  ALTER TABLE "assinantes_rels" ADD CONSTRAINT "assinantes_rels_parlamentares_fk" FOREIGN KEY ("parlamentares_id") REFERENCES "public"."parlamentares"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "assinantes_rels_parlamentares_id_idx" ON "assinantes_rels" USING btree ("parlamentares_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "emails_automaticos" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "emails_automaticos" CASCADE;
  ALTER TABLE "assinantes_rels" DROP CONSTRAINT "assinantes_rels_parlamentares_fk";
  
  DROP INDEX "assinantes_rels_parlamentares_id_idx";
  ALTER TABLE "assinantes" ALTER COLUMN "alertas" SET DEFAULT true;
  ALTER TABLE "assinantes" ALTER COLUMN "resumo_semanal" SET DEFAULT true;
  ALTER TABLE "assinantes_rels" DROP COLUMN "parlamentares_id";`)
}
