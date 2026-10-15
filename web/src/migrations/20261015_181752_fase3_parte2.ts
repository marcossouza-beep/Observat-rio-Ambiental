import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_proposicoes_casa_origem" AS ENUM('camara', 'senado', 'congresso', 'presidencia');
  CREATE TYPE "public"."enum_emails_automaticos_resumo_notas_regionais_regiao" AS ENUM('Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul');
  CREATE TABLE "emails_automaticos_resumo_notas_regionais" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"regiao" "enum_emails_automaticos_resumo_notas_regionais_regiao" NOT NULL,
  	"nota" varchar NOT NULL
  );
  
  ALTER TABLE "proposicoes" ADD COLUMN "casa_origem" "enum_proposicoes_casa_origem";
  ALTER TABLE "temas" ADD COLUMN "o_que_temos_visto" varchar;
  ALTER TABLE "biomas" ADD COLUMN "pressoes" varchar;
  ALTER TABLE "biomas" ADD COLUMN "avancos" varchar;
  ALTER TABLE "emails_automaticos_resumo_notas_regionais" ADD CONSTRAINT "emails_automaticos_resumo_notas_regionais_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."emails_automaticos"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "emails_automaticos_resumo_notas_regionais_order_idx" ON "emails_automaticos_resumo_notas_regionais" USING btree ("_order");
  CREATE INDEX "emails_automaticos_resumo_notas_regionais_parent_id_idx" ON "emails_automaticos_resumo_notas_regionais" USING btree ("_parent_id");`)
  // Casa de origem das propostas federais já gravadas (mesma regra de lib/panorama.ts: casaDeOrigem)
  await db.execute(sql`
  UPDATE "proposicoes" SET "casa_origem" = (CASE
    WHEN upper("sigla") = 'MPV' THEN 'presidencia'
    WHEN "chave_origem" LIKE 'camara:%' THEN 'camara'
    WHEN "chave_origem" LIKE 'senado:%' THEN 'senado'
    WHEN "chave_origem" LIKE 'congresso:%' THEN 'congresso'
    WHEN "casa" IN ('camara', 'senado', 'congresso', 'presidencia') THEN "casa"::text
  END)::"enum_proposicoes_casa_origem"
  WHERE "esfera" = 'federal' AND "casa_origem" IS NULL;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "emails_automaticos_resumo_notas_regionais" CASCADE;
  ALTER TABLE "proposicoes" DROP COLUMN "casa_origem";
  ALTER TABLE "temas" DROP COLUMN "o_que_temos_visto";
  ALTER TABLE "biomas" DROP COLUMN "pressoes";
  ALTER TABLE "biomas" DROP COLUMN "avancos";
  DROP TYPE "public"."enum_proposicoes_casa_origem";
  DROP TYPE "public"."enum_emails_automaticos_resumo_notas_regionais_regiao";`)
}
