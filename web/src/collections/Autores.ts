import type { CollectionConfig } from 'payload'
import { equipe, publico } from '../access'
import { slugify } from '../lib/texto'

export const Autores: CollectionConfig = {
  slug: 'autores',
  labels: { singular: 'Autor', plural: 'Autores' },
  admin: { group: 'Conteúdo', useAsTitle: 'nome' },
  access: { read: publico, create: equipe, update: equipe, delete: equipe },
  hooks: {
    beforeValidate: [({ data }) => (data && !data.slug && data.nome ? { ...data, slug: slugify(data.nome) } : data)],
  },
  fields: [
    { name: 'nome', type: 'text', required: true },
    { name: 'slug', type: 'text', unique: true, index: true },
    { name: 'titulo', type: 'text', admin: { description: 'Ex.: Mestre em Direito Ambiental' } },
    { name: 'foto', type: 'upload', relationTo: 'media' },
    { name: 'bio', label: 'Biografia', type: 'textarea' },
    {
      name: 'redes',
      type: 'group',
      fields: [
        { name: 'linkedin', type: 'text' },
        { name: 'lattes', type: 'text' },
        { name: 'instagram', type: 'text' },
        { name: 'x', type: 'text' },
      ],
    },
    { name: 'emailPublico', type: 'email' },
  ],
}
