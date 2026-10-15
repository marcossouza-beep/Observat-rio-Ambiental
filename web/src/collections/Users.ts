import type { CollectionConfig } from 'payload'
import { admin, equipe } from '../access'

export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Pessoa da equipe', plural: 'Equipe' },
  admin: { useAsTitle: 'email', group: 'Ajustes', defaultColumns: ['email', 'nome', 'papel'] },
  auth: true,
  access: { read: equipe, create: admin, update: equipe, delete: admin },
  fields: [
    { name: 'nome', type: 'text' },
    {
      name: 'papel',
      type: 'select',
      required: true,
      defaultValue: 'autor',
      options: [
        { label: 'Administrador', value: 'admin' },
        { label: 'Autor', value: 'autor' },
        { label: 'Revisor', value: 'revisor' },
      ],
      access: { update: ({ req: { user } }) => (user as { papel?: string } | null)?.papel === 'admin' },
    },
    { name: 'autor', type: 'relationship', relationTo: 'autores', admin: { description: 'Perfil público usado na assinatura dos pareceres' } },
  ],
}
