import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "envios" ALTER COLUMN "tipo" SET DATA TYPE text;
  DROP TYPE "public"."enum_envios_tipo";
  CREATE TYPE "public"."enum_envios_tipo" AS ENUM('acesso', 'aviso_publicacao', 'alerta', 'resumo', 'comunicado', 'resposta_pedido');
  ALTER TABLE "envios" ALTER COLUMN "tipo" SET DATA TYPE "public"."enum_envios_tipo" USING "tipo"::"public"."enum_envios_tipo";
  ALTER TABLE "pareceres" DROP COLUMN "embargo";
  ALTER TABLE "_pareceres_v" DROP COLUMN "version_embargo";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_envios_tipo" ADD VALUE 'embargo' BEFORE 'comunicado';
  ALTER TABLE "pareceres" ADD COLUMN "embargo" boolean DEFAULT false;
  ALTER TABLE "_pareceres_v" ADD COLUMN "version_embargo" boolean DEFAULT false;`)
}
