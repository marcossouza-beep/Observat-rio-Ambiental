import { APIError, type CollectionConfig, type Field } from 'payload'
import { equipe, publicadoOuEquipe } from '../access'
import { mudarCompromissos } from '../hooks/compromissos'
import { revalidarAoApagar, revalidarAoMudar } from '../hooks/revalidar'
import { checarPublicacao, SECOES_PARECER } from '../lib/publicacao'

const idDe = (v: unknown) => (v && typeof v === 'object' ? (v as { id: unknown }).id : v) ?? null

const secoes: Field[] = SECOES_PARECER.map((s) => ({ name: s.nome, label: s.rotulo, type: 'richText' as const }))

export const Pareceres: CollectionConfig = {
  slug: 'pareceres',
  typescript: { interface: 'Parecer' },
  labels: { singular: 'Parecer', plural: 'Pareceres' },
  admin: {
    group: 'Trabalho',
    useAsTitle: 'titulo',
    defaultColumns: ['titulo', 'proposicao', 'status', 'carater', 'impacto', 'publicadoEm'],
  },
  access: { read: publicadoOuEquipe, create: equipe, update: equipe, delete: equipe },
  versions: { maxPerDoc: 100 },
  hooks: {
    beforeChange: [
      async ({ data, originalDoc, req }) => {
        // Nova versão do texto analisada depois de publicado → nova versão do parecer.
        if (originalDoc?.publicadoEm && idDe(data.versaoTexto) !== idDe(originalDoc.versaoTexto) && (data.versao ?? 1) <= (originalDoc.versao ?? 1)) {
          data.versao = (originalDoc.versao ?? 1) + 1
        }
        const publicando =
          data.status === 'publicado' &&
          (originalDoc?.status !== 'publicado' || (data.versao ?? 1) > (originalDoc?.versao ?? 1) || !!originalDoc?.desatualizadoDesde)
        if (publicando) {
          const r = checarPublicacao({
            secoes: data.secoes,
            impacto: data.impacto,
            carater: data.carater,
            versao: data.versao,
            notaDaVersao: data.notaDaVersao,
            temNotaTecnica: !!data.materiais?.notaTecnica,
            seo: data.seo,
          })
          if (!r.pode) throw new APIError(`Ainda não dá para publicar: ${r.travas.join('; ')}.`, 400, { travas: r.travas }, true)
          const agora = new Date().toISOString()
          data.publicadoEm = originalDoc?.publicadoEm || agora
          data.atualizadoEm = agora
          data.desatualizadoDesde = null
        }
        if (!data.slug && data.proposicao) {
          const prop = await req.payload.findByID({ collection: 'proposicoes', id: idDe(data.proposicao) as number, req, depth: 0 })
          data.slug = prop?.slug
          if (!data.titulo) data.titulo = prop?.titulo || prop?.rotulo
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, req }) => {
        const acabouDePublicar =
          doc.status === 'publicado' && (previousDoc?.status !== 'publicado' || (previousDoc?.desatualizadoDesde && !doc.desatualizadoDesde))
        if (!acabouDePublicar) return doc
        await mudarCompromissos(req, { alvo: 'proposicoes', alvoId: idDe(doc.proposicao) as number, tipos: ['parecer_prometido'], status: 'cumprido' })
        await mudarCompromissos(req, { alvo: 'pareceres', alvoId: doc.id, tipos: ['atualizacao'], status: 'cumprido' })
        return doc
      },
      revalidarAoMudar,
    ],
    afterDelete: [revalidarAoApagar],
  },
  fields: [
    { name: 'titulo', type: 'text' },
    { name: 'proposicao', label: 'Proposição', type: 'relationship', relationTo: 'proposicoes', required: true, unique: true },
    {
      type: 'tabs',
      tabs: [
        { label: 'Parecer', name: 'secoes', fields: secoes },
        {
          label: 'Classificação',
          fields: [
            {
              name: 'impacto',
              type: 'select',
              options: [
                { label: 'Alto', value: 'alto' },
                { label: 'Médio', value: 'medio' },
                { label: 'Baixo', value: 'baixo' },
              ],
              admin: { description: 'Na dúvida entre dois níveis, use o mais alto e explique no parecer.' },
            },
            {
              name: 'carater',
              label: 'Caráter',
              type: 'select',
              options: [
                { label: 'Maléfico (enfraquece diretamente)', value: 'malefico' },
                { label: 'Enfraquece indiretamente', value: 'enfraquece_indiretamente' },
                { label: 'Neutro', value: 'neutro' },
                { label: 'Benéfico (fortalece a proteção)', value: 'benefico' },
              ],
            },
            { name: 'areas', label: 'Áreas', type: 'relationship', relationTo: 'temas', hasMany: true },
            { name: 'biomas', type: 'relationship', relationTo: 'biomas', hasMany: true },
          ],
        },
        {
          label: 'SEO',
          name: 'seo',
          fields: [
            { name: 'palavraChave', label: 'Palavra-chave principal', type: 'text' },
            { name: 'nomePopular', type: 'text', admin: { description: 'Como a imprensa chama a proposta' } },
            { name: 'secundarias', label: 'Palavras secundárias', type: 'text', hasMany: true },
            { name: 'tituloSeo', label: 'Título SEO', type: 'text', admin: { description: 'Até 60 caracteres' } },
            { name: 'metaDescricao', label: 'Descrição', type: 'textarea', admin: { description: 'Até 155 caracteres' } },
            { name: 'indexar', type: 'checkbox', defaultValue: true },
          ],
        },
        {
          label: 'Materiais',
          name: 'materiais',
          fields: [
            { name: 'notaTecnica', label: 'Nota técnica (PDF)', type: 'upload', relationTo: 'materiais' },
            { name: 'quadroComparativo', label: 'Quadro comparativo (PDF)', type: 'upload', relationTo: 'materiais' },
          ],
        },
      ],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'rascunho',
      options: [
        { label: 'Rascunho', value: 'rascunho' },
        { label: 'Em revisão', value: 'em_revisao' },
        { label: 'Agendado', value: 'agendado' },
        { label: 'Publicado', value: 'publicado' },
      ],
      admin: { position: 'sidebar' },
    },
    { name: 'agendadoPara', type: 'date', admin: { position: 'sidebar', date: { pickerAppearance: 'dayAndTime' }, condition: (d) => d.status === 'agendado' } },
    { name: 'embargo', label: 'Enviar antes à imprensa credenciada', type: 'checkbox', defaultValue: false, admin: { position: 'sidebar' } },
    { name: 'autor', type: 'relationship', relationTo: 'autores', admin: { position: 'sidebar' } },
    { name: 'versao', label: 'Versão do parecer', type: 'number', defaultValue: 1, admin: { position: 'sidebar', readOnly: true } },
    { name: 'versaoTexto', label: 'Versão do texto analisada', type: 'relationship', relationTo: 'versoes', admin: { position: 'sidebar' } },
    { name: 'notaDaVersao', label: 'O que mudou nesta versão', type: 'textarea', admin: { position: 'sidebar', condition: (d) => (d.versao ?? 1) > 1 } },
    { name: 'desatualizadoDesde', label: 'Texto mudou em', type: 'date', admin: { position: 'sidebar', readOnly: true, description: 'Preenchido sozinho quando chega uma versão nova do texto' } },
    { name: 'publicadoEm', type: 'date', admin: { position: 'sidebar', readOnly: true } },
    { name: 'atualizadoEm', type: 'date', admin: { position: 'sidebar', readOnly: true } },
    { name: 'slug', label: 'Endereço', type: 'text', unique: true, index: true, admin: { position: 'sidebar' } },
  ],
}
