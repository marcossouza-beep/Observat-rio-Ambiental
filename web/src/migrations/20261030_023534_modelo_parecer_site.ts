import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pareceres" ADD COLUMN "secoes_o_que_e" jsonb;
  ALTER TABLE "pareceres" ADD COLUMN "secoes_classificacao" jsonb;
  ALTER TABLE "pareceres" ADD COLUMN "secoes_por_que_importa" jsonb;
  ALTER TABLE "pareceres" ADD COLUMN "secoes_proximos_passos" jsonb;
  ALTER TABLE "_pareceres_v" ADD COLUMN "version_secoes_o_que_e" jsonb;
  ALTER TABLE "_pareceres_v" ADD COLUMN "version_secoes_classificacao" jsonb;
  ALTER TABLE "_pareceres_v" ADD COLUMN "version_secoes_por_que_importa" jsonb;
  ALTER TABLE "_pareceres_v" ADD COLUMN "version_secoes_proximos_passos" jsonb;
  ALTER TABLE "pareceres" DROP COLUMN "secoes_impactos";
  ALTER TABLE "pareceres" DROP COLUMN "secoes_base_legal";
  ALTER TABLE "pareceres" DROP COLUMN "secoes_recomendacoes";
  ALTER TABLE "pareceres" DROP COLUMN "secoes_conclusao";
  ALTER TABLE "_pareceres_v" DROP COLUMN "version_secoes_impactos";
  ALTER TABLE "_pareceres_v" DROP COLUMN "version_secoes_base_legal";
  ALTER TABLE "_pareceres_v" DROP COLUMN "version_secoes_recomendacoes";
  ALTER TABLE "_pareceres_v" DROP COLUMN "version_secoes_conclusao";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pareceres" ADD COLUMN "secoes_impactos" jsonb;
  ALTER TABLE "pareceres" ADD COLUMN "secoes_base_legal" jsonb;
  ALTER TABLE "pareceres" ADD COLUMN "secoes_recomendacoes" jsonb;
  ALTER TABLE "pareceres" ADD COLUMN "secoes_conclusao" jsonb;
  ALTER TABLE "_pareceres_v" ADD COLUMN "version_secoes_impactos" jsonb;
  ALTER TABLE "_pareceres_v" ADD COLUMN "version_secoes_base_legal" jsonb;
  ALTER TABLE "_pareceres_v" ADD COLUMN "version_secoes_recomendacoes" jsonb;
  ALTER TABLE "_pareceres_v" ADD COLUMN "version_secoes_conclusao" jsonb;
  ALTER TABLE "pareceres" DROP COLUMN "secoes_o_que_e";
  ALTER TABLE "pareceres" DROP COLUMN "secoes_classificacao";
  ALTER TABLE "pareceres" DROP COLUMN "secoes_por_que_importa";
  ALTER TABLE "pareceres" DROP COLUMN "secoes_proximos_passos";
  ALTER TABLE "_pareceres_v" DROP COLUMN "version_secoes_o_que_e";
  ALTER TABLE "_pareceres_v" DROP COLUMN "version_secoes_classificacao";
  ALTER TABLE "_pareceres_v" DROP COLUMN "version_secoes_por_que_importa";
  ALTER TABLE "_pareceres_v" DROP COLUMN "version_secoes_proximos_passos";`)
}
