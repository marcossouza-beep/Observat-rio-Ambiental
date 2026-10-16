import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "ajustes" ALTER COLUMN "prazos_parecer" SET DEFAULT 4;
  ALTER TABLE "ajustes" ALTER COLUMN "prazos_atualizacao" SET DEFAULT 4;`)
  // Regra dos 4 dias: troca só os valores que ainda são os padrões antigos (7 e 5); o que o autor mudou fica
  await db.execute(sql`
   UPDATE "ajustes" SET "prazos_parecer" = 4 WHERE "prazos_parecer" = 7;
  UPDATE "ajustes" SET "prazos_atualizacao" = 4 WHERE "prazos_atualizacao" = 5;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "ajustes" ALTER COLUMN "prazos_parecer" SET DEFAULT 7;
  ALTER TABLE "ajustes" ALTER COLUMN "prazos_atualizacao" SET DEFAULT 5;`)
}
