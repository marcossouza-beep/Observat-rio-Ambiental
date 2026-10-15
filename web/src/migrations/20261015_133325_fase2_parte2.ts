import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "proposicoes_leis_afetadas" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"rotulo" varchar,
  	"url" varchar,
  	"urn" varchar
  );
  
  ALTER TABLE "versoes" ADD COLUMN "sem_texto_motivo" varchar;
  ALTER TABLE "versoes" ADD COLUMN "tentativas_texto" numeric DEFAULT 0;
  ALTER TABLE "proposicoes_leis_afetadas" ADD CONSTRAINT "proposicoes_leis_afetadas_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."proposicoes"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "proposicoes_leis_afetadas_order_idx" ON "proposicoes_leis_afetadas" USING btree ("_order");
  CREATE INDEX "proposicoes_leis_afetadas_parent_id_idx" ON "proposicoes_leis_afetadas" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "proposicoes_leis_afetadas" CASCADE;
  ALTER TABLE "versoes" DROP COLUMN "sem_texto_motivo";
  ALTER TABLE "versoes" DROP COLUMN "tentativas_texto";`)
}
