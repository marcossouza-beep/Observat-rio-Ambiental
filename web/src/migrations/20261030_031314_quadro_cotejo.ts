import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_pareceres_secoes_comparativo_efeito" AS ENUM('amplia', 'reduz', 'neutro');
  CREATE TYPE "public"."enum__pareceres_v_version_secoes_comparativo_efeito" AS ENUM('amplia', 'reduz', 'neutro');
  CREATE TABLE "pareceres_secoes_comparativo" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"dispositivo" varchar,
  	"vigente" varchar NOT NULL,
  	"proposto" varchar NOT NULL,
  	"efeito" "enum_pareceres_secoes_comparativo_efeito" NOT NULL
  );
  
  CREATE TABLE "_pareceres_v_version_secoes_comparativo" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"dispositivo" varchar,
  	"vigente" varchar NOT NULL,
  	"proposto" varchar NOT NULL,
  	"efeito" "enum__pareceres_v_version_secoes_comparativo_efeito" NOT NULL,
  	"_uuid" varchar
  );
  
  ALTER TABLE "pareceres_secoes_comparativo" ADD CONSTRAINT "pareceres_secoes_comparativo_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pareceres"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pareceres_v_version_secoes_comparativo" ADD CONSTRAINT "_pareceres_v_version_secoes_comparativo_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pareceres_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pareceres_secoes_comparativo_order_idx" ON "pareceres_secoes_comparativo" USING btree ("_order");
  CREATE INDEX "pareceres_secoes_comparativo_parent_id_idx" ON "pareceres_secoes_comparativo" USING btree ("_parent_id");
  CREATE INDEX "_pareceres_v_version_secoes_comparativo_order_idx" ON "_pareceres_v_version_secoes_comparativo" USING btree ("_order");
  CREATE INDEX "_pareceres_v_version_secoes_comparativo_parent_id_idx" ON "_pareceres_v_version_secoes_comparativo" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "pareceres_secoes_comparativo" CASCADE;
  DROP TABLE "_pareceres_v_version_secoes_comparativo" CASCADE;
  DROP TYPE "public"."enum_pareceres_secoes_comparativo_efeito";
  DROP TYPE "public"."enum__pareceres_v_version_secoes_comparativo_efeito";`)
}
