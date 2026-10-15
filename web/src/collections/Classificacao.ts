import type { CollectionConfig } from 'payload'
import { equipe, publico } from '../access'
import { slugify } from '../lib/texto'

const comSlug = ({ data }: { data?: Record<string, unknown> }) =>
  data && !data.slug && typeof data.nome === 'string' ? { ...data, slug: slugify(data.nome) } : data

const camposTexto = [
  { name: 'nome', type: 'text' as const, required: true },
  { name: 'slug', type: 'text' as const, unique: true, index: true },
  {
    name: 'textoAbertura',
    label: 'Texto de abertura',
    type: 'textarea' as const,
    admin: { description: 'Escrito pelo autor. Sem ele, a página funciona mas fica fora da busca do Google.' },
  },
  { name: 'revisarEm', label: 'Revisar em', type: 'date' as const },
]

export const Temas: CollectionConfig = {
  slug: 'temas',
  labels: { singular: 'Tema', plural: 'Temas' },
  admin: { group: 'Classificação', useAsTitle: 'nome' },
  access: { read: publico, create: equipe, update: equipe, delete: equipe },
  hooks: { beforeValidate: [comSlug] },
  fields: camposTexto,
}

export const Biomas: CollectionConfig = {
  slug: 'biomas',
  labels: { singular: 'Bioma', plural: 'Biomas' },
  admin: { group: 'Classificação', useAsTitle: 'nome' },
  access: { read: publico, create: equipe, update: equipe, delete: equipe },
  hooks: { beforeValidate: [comSlug] },
  fields: [...camposTexto, { name: 'ufs', label: 'Estados que abrange', type: 'text', hasMany: true }],
}

export const PalavrasChave: CollectionConfig = {
  slug: 'palavras-chave',
  labels: { singular: 'Palavra-chave', plural: 'Palavras-chave' },
  admin: { group: 'Classificação', useAsTitle: 'termo', defaultColumns: ['termo', 'grupo', 'peso', 'exclusao'] },
  access: { read: equipe, create: equipe, update: equipe, delete: equipe },
  fields: [
    { name: 'termo', type: 'text', required: true, unique: true },
    { name: 'grupo', type: 'text', admin: { description: 'Tema ou eixo (ex.: Licenciamento, Espécies exóticas)' } },
    { name: 'peso', type: 'number', min: 0, max: 10, defaultValue: 5, required: true },
    { name: 'exclusao', label: 'Termo de exclusão', type: 'checkbox', defaultValue: false, admin: { description: 'Zera a nota (ex.: "denominação de rodovia")' } },
    { name: 'uf', label: 'Só para o estado', type: 'text', admin: { description: 'Vazio = nacional' } },
  ],
}
