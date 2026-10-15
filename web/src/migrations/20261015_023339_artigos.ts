import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_artigos_tipo" AS ENUM('tendencia', 'explicador', 'dados');
  CREATE TYPE "public"."enum_artigos_status" AS ENUM('rascunho', 'publicado');
  CREATE TYPE "public"."enum__artigos_v_version_tipo" AS ENUM('tendencia', 'explicador', 'dados');
  CREATE TYPE "public"."enum__artigos_v_version_status" AS ENUM('rascunho', 'publicado');
  CREATE TABLE "artigos" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"titulo" varchar NOT NULL,
  	"resumo" varchar,
  	"tipo" "enum_artigos_tipo" DEFAULT 'tendencia',
  	"corpo" jsonb,
  	"status" "enum_artigos_status" DEFAULT 'rascunho',
  	"autor_id" integer,
  	"publicado_em" timestamp(3) with time zone,
  	"slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "artigos_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"temas_id" integer,
  	"biomas_id" integer,
  	"proposicoes_id" integer
  );
  
  CREATE TABLE "_artigos_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_titulo" varchar NOT NULL,
  	"version_resumo" varchar,
  	"version_tipo" "enum__artigos_v_version_tipo" DEFAULT 'tendencia',
  	"version_corpo" jsonb,
  	"version_status" "enum__artigos_v_version_status" DEFAULT 'rascunho',
  	"version_autor_id" integer,
  	"version_publicado_em" timestamp(3) with time zone,
  	"version_slug" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_artigos_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"temas_id" integer,
  	"biomas_id" integer,
  	"proposicoes_id" integer
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "artigos_id" integer;
  ALTER TABLE "artigos" ADD CONSTRAINT "artigos_autor_id_autores_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."autores"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "artigos_rels" ADD CONSTRAINT "artigos_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."artigos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "artigos_rels" ADD CONSTRAINT "artigos_rels_temas_fk" FOREIGN KEY ("temas_id") REFERENCES "public"."temas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "artigos_rels" ADD CONSTRAINT "artigos_rels_biomas_fk" FOREIGN KEY ("biomas_id") REFERENCES "public"."biomas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "artigos_rels" ADD CONSTRAINT "artigos_rels_proposicoes_fk" FOREIGN KEY ("proposicoes_id") REFERENCES "public"."proposicoes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_artigos_v" ADD CONSTRAINT "_artigos_v_parent_id_artigos_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."artigos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_artigos_v" ADD CONSTRAINT "_artigos_v_version_autor_id_autores_id_fk" FOREIGN KEY ("version_autor_id") REFERENCES "public"."autores"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_artigos_v_rels" ADD CONSTRAINT "_artigos_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_artigos_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_artigos_v_rels" ADD CONSTRAINT "_artigos_v_rels_temas_fk" FOREIGN KEY ("temas_id") REFERENCES "public"."temas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_artigos_v_rels" ADD CONSTRAINT "_artigos_v_rels_biomas_fk" FOREIGN KEY ("biomas_id") REFERENCES "public"."biomas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_artigos_v_rels" ADD CONSTRAINT "_artigos_v_rels_proposicoes_fk" FOREIGN KEY ("proposicoes_id") REFERENCES "public"."proposicoes"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "artigos_autor_idx" ON "artigos" USING btree ("autor_id");
  CREATE UNIQUE INDEX "artigos_slug_idx" ON "artigos" USING btree ("slug");
  CREATE INDEX "artigos_updated_at_idx" ON "artigos" USING btree ("updated_at");
  CREATE INDEX "artigos_created_at_idx" ON "artigos" USING btree ("created_at");
  CREATE INDEX "artigos_rels_order_idx" ON "artigos_rels" USING btree ("order");
  CREATE INDEX "artigos_rels_parent_idx" ON "artigos_rels" USING btree ("parent_id");
  CREATE INDEX "artigos_rels_path_idx" ON "artigos_rels" USING btree ("path");
  CREATE INDEX "artigos_rels_temas_id_idx" ON "artigos_rels" USING btree ("temas_id");
  CREATE INDEX "artigos_rels_biomas_id_idx" ON "artigos_rels" USING btree ("biomas_id");
  CREATE INDEX "artigos_rels_proposicoes_id_idx" ON "artigos_rels" USING btree ("proposicoes_id");
  CREATE INDEX "_artigos_v_parent_idx" ON "_artigos_v" USING btree ("parent_id");
  CREATE INDEX "_artigos_v_version_version_autor_idx" ON "_artigos_v" USING btree ("version_autor_id");
  CREATE INDEX "_artigos_v_version_version_slug_idx" ON "_artigos_v" USING btree ("version_slug");
  CREATE INDEX "_artigos_v_version_version_updated_at_idx" ON "_artigos_v" USING btree ("version_updated_at");
  CREATE INDEX "_artigos_v_version_version_created_at_idx" ON "_artigos_v" USING btree ("version_created_at");
  CREATE INDEX "_artigos_v_created_at_idx" ON "_artigos_v" USING btree ("created_at");
  CREATE INDEX "_artigos_v_updated_at_idx" ON "_artigos_v" USING btree ("updated_at");
  CREATE INDEX "_artigos_v_rels_order_idx" ON "_artigos_v_rels" USING btree ("order");
  CREATE INDEX "_artigos_v_rels_parent_idx" ON "_artigos_v_rels" USING btree ("parent_id");
  CREATE INDEX "_artigos_v_rels_path_idx" ON "_artigos_v_rels" USING btree ("path");
  CREATE INDEX "_artigos_v_rels_temas_id_idx" ON "_artigos_v_rels" USING btree ("temas_id");
  CREATE INDEX "_artigos_v_rels_biomas_id_idx" ON "_artigos_v_rels" USING btree ("biomas_id");
  CREATE INDEX "_artigos_v_rels_proposicoes_id_idx" ON "_artigos_v_rels" USING btree ("proposicoes_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_artigos_fk" FOREIGN KEY ("artigos_id") REFERENCES "public"."artigos"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_artigos_id_idx" ON "payload_locked_documents_rels" USING btree ("artigos_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "artigos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "artigos_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_artigos_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_artigos_v_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "artigos" CASCADE;
  DROP TABLE "artigos_rels" CASCADE;
  DROP TABLE "_artigos_v" CASCADE;
  DROP TABLE "_artigos_v_rels" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_artigos_fk";
  
  DROP INDEX "payload_locked_documents_rels_artigos_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "artigos_id";
  DROP TYPE "public"."enum_artigos_tipo";
  DROP TYPE "public"."enum_artigos_status";
  DROP TYPE "public"."enum__artigos_v_version_tipo";
  DROP TYPE "public"."enum__artigos_v_version_status";`)
}
