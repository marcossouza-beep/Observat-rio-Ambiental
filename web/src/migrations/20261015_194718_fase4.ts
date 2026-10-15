import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "fontes" ADD COLUMN "url" varchar;
  ALTER TABLE "fontes" ADD COLUMN "levantamento_motivo" varchar;
  ALTER TABLE "fontes" ADD COLUMN "levantamento_verificado_em" timestamp(3) with time zone;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "fontes" DROP COLUMN "url";
  ALTER TABLE "fontes" DROP COLUMN "levantamento_motivo";
  ALTER TABLE "fontes" DROP COLUMN "levantamento_verificado_em";`)
}
