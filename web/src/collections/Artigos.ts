import type { CollectionConfig } from 'payload'
import { equipe, publicadoOuEquipe } from '../access'
import { revalidarAoApagar, revalidarAoMudar } from '../hooks/revalidar'
import { slugify } from '../lib/texto'

export const Artigos: CollectionConfig = {
  slug: 'artigos',
  typescript: { interface: 'Artigo' },
  labels: { singular: 'Artigo', plural: 'Artigos' },
  admin: { group: 'Conteúdo', useAsTitle: 'titulo', defaultColumns: ['titulo', 'status', 'publicadoEm'] },
  access: { read: publicadoOuEquipe, create: equipe, update: equipe, delete: equipe },
  versions: { maxPerDoc: 50 },
  hooks: {
    beforeChange: [
      ({ data, originalDoc }) => {
        if (!data.slug && data.titulo) data.slug = slugify(data.titulo).slice(0, 90)
        if (data.status === 'publicado' && !originalDoc?.publicadoEm && !data.publicadoEm) data.publicadoEm = new Date().toISOString()
        return data
      },
    ],
    afterChange: [revalidarAoMudar],
    afterDelete: [revalidarAoApagar],
  },
  fields: [
    { name: 'titulo', label: 'Título', type: 'text', required: true },
    { name: 'resumo', type: 'textarea', admin: { description: 'Uma ou duas frases; aparece na lista e na busca do Google' } },
    {
      name: 'tipo',
      type: 'select',
      defaultValue: 'tendencia',
      options: [
        { label: 'Tendência', value: 'tendencia' },
        { label: 'Explicador', value: 'explicador' },
        { label: 'Dados', value: 'dados' },
      ],
    },
    { name: 'corpo', type: 'richText' },
    { name: 'temas', type: 'relationship', relationTo: 'temas', hasMany: true },
    { name: 'biomas', type: 'relationship', relationTo: 'biomas', hasMany: true },
    { name: 'proposicoes', label: 'Leis citadas', type: 'relationship', relationTo: 'proposicoes', hasMany: true },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'rascunho',
      options: [
        { label: 'Rascunho', value: 'rascunho' },
        { label: 'Publicado', value: 'publicado' },
      ],
      admin: { position: 'sidebar' },
    },
    { name: 'autor', type: 'relationship', relationTo: 'autores', admin: { position: 'sidebar' } },
    { name: 'publicadoEm', type: 'date', admin: { position: 'sidebar' } },
    { name: 'slug', label: 'Endereço', type: 'text', unique: true, index: true, admin: { position: 'sidebar' } },
  ],
}
