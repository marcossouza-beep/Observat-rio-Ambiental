import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pedidos" ADD COLUMN "correcao_publica" varchar;
  ALTER TABLE "pedidos" ADD COLUMN "correcao_id" integer;
  ALTER TABLE "ajustes" ADD COLUMN "meta_semanal" numeric DEFAULT 6;
  ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_correcao_id_correcoes_id_fk" FOREIGN KEY ("correcao_id") REFERENCES "public"."correcoes"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "pedidos_correcao_idx" ON "pedidos" USING btree ("correcao_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pedidos" DROP CONSTRAINT "pedidos_correcao_id_correcoes_id_fk";
  
  DROP INDEX "pedidos_correcao_idx";
  ALTER TABLE "pedidos" DROP COLUMN "correcao_publica";
  ALTER TABLE "pedidos" DROP COLUMN "correcao_id";
  ALTER TABLE "ajustes" DROP COLUMN "meta_semanal";`)
}
