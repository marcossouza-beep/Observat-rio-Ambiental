import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "comunicados" ALTER COLUMN "status" SET DATA TYPE text;
  ALTER TABLE "comunicados" ALTER COLUMN "status" SET DEFAULT 'rascunho'::text;
  DROP TYPE "public"."enum_comunicados_status";
  CREATE TYPE "public"."enum_comunicados_status" AS ENUM('rascunho', 'agendado', 'enviado');
  ALTER TABLE "comunicados" ALTER COLUMN "status" SET DEFAULT 'rascunho'::"public"."enum_comunicados_status";
  ALTER TABLE "comunicados" ALTER COLUMN "status" SET DATA TYPE "public"."enum_comunicados_status" USING "status"::"public"."enum_comunicados_status";
  ALTER TABLE "assinantes" ADD COLUMN "token_hash" varchar;
  ALTER TABLE "assinantes" ADD COLUMN "token_expira" timestamp(3) with time zone;
  ALTER TABLE "envios" ADD COLUMN "para" varchar NOT NULL;
  ALTER TABLE "envios" ADD COLUMN "assunto" varchar NOT NULL;
  ALTER TABLE "envios" ADD COLUMN "html" varchar;
  ALTER TABLE "envios" ADD COLUMN "texto" varchar;
  ALTER TABLE "envios" ADD COLUMN "tentativas" numeric DEFAULT 0;
  CREATE INDEX "assinantes_token_hash_idx" ON "assinantes" USING btree ("token_hash");
  CREATE INDEX "envios_status_idx" ON "envios" USING btree ("status");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_comunicados_status" ADD VALUE 'enviando' BEFORE 'enviado';
  DROP INDEX "assinantes_token_hash_idx";
  DROP INDEX "envios_status_idx";
  ALTER TABLE "assinantes" DROP COLUMN "token_hash";
  ALTER TABLE "assinantes" DROP COLUMN "token_expira";
  ALTER TABLE "envios" DROP COLUMN "para";
  ALTER TABLE "envios" DROP COLUMN "assunto";
  ALTER TABLE "envios" DROP COLUMN "html";
  ALTER TABLE "envios" DROP COLUMN "texto";
  ALTER TABLE "envios" DROP COLUMN "tentativas";`)
}
