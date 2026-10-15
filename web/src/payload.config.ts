import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { s3Storage } from '@payloadcms/storage-s3'
import { pt } from '@payloadcms/translations/languages/pt'
import path from 'path'
import { buildConfig, type Config } from 'payload'
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

/** Datas no formato brasileiro em todos os campos do painel. */
type CampoQualquer = { type?: string; admin?: Record<string, unknown>; fields?: CampoQualquer[]; tabs?: { fields: CampoQualquer[] }[] }
function datasEmPortugues(campos: CampoQualquer[]): void {
  for (const c of campos) {
    if (c.type === 'date') {
      const adm = (c.admin ||= {}) as { date?: { pickerAppearance?: string; displayFormat?: string } }
      adm.date = { ...(adm.date || {}) }
      if (!adm.date.displayFormat) adm.date.displayFormat = adm.date.pickerAppearance === 'dayAndTime' ? 'dd/MM/yyyy HH:mm' : 'dd/MM/yyyy'
    }
    if (c.fields) datasEmPortugues(c.fields)
    if (c.tabs) c.tabs.forEach((t) => datasEmPortugues(t.fields))
  }
}

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const config: Config = {
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    meta: { titleSuffix: ' · Painel do Observatório' },
    components: {
      beforeDashboard: ['/painel/Hoje#Hoje'],
      beforeNavLinks: ['/painel/Navegacao#Navegacao'],
      graphics: { Icon: '/painel/Marca#Icone', Logo: '/painel/Marca#Logo' },
      views: {
        triagem: { Component: '/painel/Triagem#Triagem', path: '/triagem', meta: { title: 'Triagem' } },
        fila: { Component: '/painel/Fila#Fila', path: '/fila', meta: { title: 'Fila de pareceres' } },
      },
    },
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
}

;[...(config.collections ?? []), ...(config.globals ?? [])].forEach((c) => datasEmPortugues(c.fields as CampoQualquer[]))

export default buildConfig(config)
