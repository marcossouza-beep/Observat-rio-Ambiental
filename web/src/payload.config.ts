import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { s3Storage } from '@payloadcms/storage-s3'
import { pt } from '@payloadcms/translations/languages/pt'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Artigos } from './collections/Artigos'
import { Autores } from './collections/Autores'
import { Biomas, PalavrasChave, Temas } from './collections/Classificacao'
import { Emendas, Parlamentares, Tramitacoes, Versoes, Votacoes, Votos } from './collections/Legislativo'
import { Materiais } from './collections/Materiais'
import { Media } from './collections/Media'
import { Pareceres } from './collections/Pareceres'
import { Proposicoes } from './collections/Proposicoes'
import { Assinantes, Comunicados, Credenciamentos, Envios } from './collections/Publico'
import { Coletas, Fontes, Verificacoes } from './collections/Sistema'
import { Compromissos, Correcoes, Pedidos } from './collections/Trabalho'
import { Users } from './collections/Users'
import { endpoints } from './endpoints'
import { Ajustes } from './globals/Ajustes'
import { migrations } from './migrations'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    meta: { titleSuffix: ' · Painel do Observatório' },
    dateFormat: 'dd/MM/yyyy HH:mm',
  },
  i18n: { supportedLanguages: { pt }, fallbackLanguage: 'pt' },
  collections: [
    // Trabalho
    Proposicoes,
    Pareceres,
    Compromissos,
    Pedidos,
    Correcoes,
    // Legislativo
    Tramitacoes,
    Versoes,
    Parlamentares,
    Votacoes,
    Votos,
    Emendas,
    // Classificação
    Temas,
    Biomas,
    PalavrasChave,
    // Público
    Assinantes,
    Credenciamentos,
    Comunicados,
    Envios,
    // Sistema
    Fontes,
    Coletas,
    Verificacoes,
    // Conteúdo e equipe
    Artigos,
    Autores,
    Media,
    Materiais,
    Users,
  ],
  globals: [Ajustes],
  endpoints,
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URL || '' },
    migrationDir: path.resolve(dirname, 'migrations'),
    // Em produção (serverless) as migrações rodam na inicialização; em desenvolvimento usamos `payload migrate`.
    prodMigrations: migrations,
    push: false,
  }),
  sharp,
  plugins: [
    // Arquivos (imagens e PDFs) no armazenamento compatível com S3 (Supabase Storage em produção).
    // Sem S3_BUCKET, ficam no disco local (só para desenvolvimento). O acesso continua passando pelo Payload,
    // que aplica as regras de leitura de cada coleção (materiais só para quem tem permissão).
    s3Storage({
      enabled: !!process.env.S3_BUCKET,
      alwaysInsertFields: true,
      collections: { media: { prefix: 'media' }, materiais: { prefix: 'materiais' } },
      bucket: process.env.S3_BUCKET || '',
      config: {
        endpoint: process.env.S3_ENDPOINT,
        region: process.env.S3_REGION || 'us-east-1',
        forcePathStyle: true,
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
        },
      },
    }),
  ],
})
