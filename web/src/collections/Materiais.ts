import type { CollectionConfig } from 'payload'
import { equipe } from '../access'

/** Nota técnica e Quadro comparativo (PDF). Entregues a inscritos por link temporário (Sprint 4). */
export const Materiais: CollectionConfig = {
  slug: 'materiais',
  typescript: { interface: 'Material' },
  labels: { singular: 'Material (PDF)', plural: 'Materiais (PDF)' },
  admin: { group: 'Conteúdo', useAsTitle: 'titulo' },
  access: { read: equipe, create: equipe, update: equipe, delete: equipe },
  fields: [
    { name: 'titulo', type: 'text', required: true },
    {
      name: 'tipo',
      type: 'select',
      required: true,
      options: [
        { label: 'Nota técnica', value: 'nota_tecnica' },
        { label: 'Quadro comparativo', value: 'quadro_comparativo' },
        { label: 'Outro', value: 'outro' },
      ],
    },
    {
      name: 'visibilidade',
      type: 'select',
      defaultValue: 'restrito',
      options: [
        { label: 'Só inscritos', value: 'restrito' },
        { label: 'Todos', value: 'publico' },
      ],
    },
  ],
  upload: { mimeTypes: ['application/pdf'] },
}
