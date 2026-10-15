import type { CollectionConfig } from 'payload'
import { equipe, publico } from '../access'

export const Media: CollectionConfig = {
  slug: 'media',
  typescript: { interface: 'Media' },
  labels: { singular: 'Imagem', plural: 'Imagens' },
  admin: { group: 'Conteúdo' },
  access: { read: publico, create: equipe, update: equipe, delete: equipe },
  fields: [{ name: 'alt', label: 'Texto alternativo', type: 'text', required: true }],
  upload: { mimeTypes: ['image/*'] },
}
