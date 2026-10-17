import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_envios_tipo" ADD VALUE 'aviso_equipe';
  ALTER TABLE "fontes" ADD COLUMN "tolerancia_horas" numeric;
  ALTER TABLE "fontes" ADD COLUMN "falhas_seguidas" numeric DEFAULT 0;
  ALTER TABLE "fontes" ADD COLUMN "alerta_enviado_em" timestamp(3) with time zone;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "envios" ALTER COLUMN "tipo" SET DATA TYPE text;
  DROP TYPE "public"."enum_envios_tipo";
  CREATE TYPE "public"."enum_envios_tipo" AS ENUM('acesso', 'aviso_publicacao', 'alerta', 'resumo', 'comunicado', 'resposta_pedido');
  ALTER TABLE "envios" ALTER COLUMN "tipo" SET DATA TYPE "public"."enum_envios_tipo" USING "tipo"::"public"."enum_envios_tipo";
  ALTER TABLE "fontes" DROP COLUMN "tolerancia_horas";
  ALTER TABLE "fontes" DROP COLUMN "falhas_seguidas";
  ALTER TABLE "fontes" DROP COLUMN "alerta_enviado_em";`)
}
