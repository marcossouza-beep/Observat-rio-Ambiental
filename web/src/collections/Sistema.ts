import type { CollectionConfig } from 'payload'
import { equipe } from '../access'
import { situacaoFonte } from '../lib/fontes'

const soEquipe = { read: equipe, create: equipe, update: equipe, delete: equipe }

export const Fontes: CollectionConfig = {
  slug: 'fontes',
  typescript: { interface: 'Fonte' },
  labels: { singular: 'Fonte', plural: 'Fontes' },
  admin: { group: 'Sistema', useAsTitle: 'nome', defaultColumns: ['nome', 'nivel', 'ultimaColetaOk', 'situacao', 'ativa'] },
  access: { ...soEquipe, read: () => true },
  fields: [
    { name: 'nome', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true, index: true },
    { name: 'conector', type: 'text', admin: { description: 'Nome do conector no código (ex.: camara)' } },
    {
      type: 'row',
      fields: [
        { name: 'nivel', label: 'Nível', type: 'select', options: ['A', 'B', 'C', 'D'].map((n) => ({ label: n, value: n })) },
        { name: 'esfera', type: 'select', options: ['federal', 'estadual', 'municipal'].map((n) => ({ label: n, value: n })) },
        { name: 'uf', label: 'UF', type: 'text', maxLength: 2 },
      ],
    },
    { name: 'frequencia', type: 'text', defaultValue: '6h, 12h, 18h, 23h' },
    { name: 'manual', label: 'Cadastro manual (nível D)', type: 'checkbox', defaultValue: false },
    { name: 'ativa', type: 'checkbox', defaultValue: true },
    { name: 'ultimaColeta', type: 'date', admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'ultimaColetaOk', label: 'Última coleta bem-sucedida', type: 'date', admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'itensUltimaColeta', type: 'number', admin: { readOnly: true } },
    { name: 'mediaItens30d', label: 'Média de itens (30 dias)', type: 'number', admin: { readOnly: true } },
    { name: 'erro', label: 'Último erro', type: 'textarea', admin: { readOnly: true } },
    {
      name: 'situacao',
      type: 'text',
      virtual: true,
      admin: { readOnly: true },
      hooks: {
        afterRead: [
          ({ siblingData }) =>
            situacaoFonte(
              {
                manual: siblingData.manual,
                ultimaColetaOk: siblingData.ultimaColetaOk ? new Date(siblingData.ultimaColetaOk) : null,
                itensUltimaColeta: siblingData.itensUltimaColeta,
                mediaItens30d: siblingData.mediaItens30d,
              },
              new Date(),
            ),
        ],
      },
    },
  ],
}

/** Registro de cada coleta, com amostra da resposta bruta (guardada por 90 dias). */
export const Coletas: CollectionConfig = {
  slug: 'coletas',
  typescript: { interface: 'Coleta' },
  labels: { singular: 'Coleta', plural: 'Coletas' },
  admin: { group: 'Sistema', defaultColumns: ['fonte', 'inicio', 'ok', 'itens'] },
  access: soEquipe,
  defaultSort: '-inicio',
  fields: [
    { name: 'fonte', type: 'relationship', relationTo: 'fontes', required: true, index: true },
    { name: 'inicio', type: 'date', required: true, admin: { date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'fim', type: 'date', admin: { date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'ok', type: 'checkbox', defaultValue: false },
    { name: 'itens', type: 'number' },
    { name: 'erro', type: 'textarea' },
    { name: 'amostra', type: 'json' },
  ],
}

export const Verificacoes: CollectionConfig = {
  slug: 'verificacoes',
  typescript: { interface: 'Verificacao' },
  labels: { singular: 'Verificação', plural: 'Verificações' },
  admin: { group: 'Sistema', defaultColumns: ['tipo', 'resultado', 'detalhe', 'createdAt'] },
  access: soEquipe,
  defaultSort: '-createdAt',
  fields: [
    {
      name: 'tipo',
      type: 'select',
      required: true,
      options: ['fonte', 'site', 'paginas', 'email', 'backup', 'links', 'sitemap', 'compromissos'].map((v) => ({ label: v, value: v })),
    },
    {
      name: 'resultado',
      type: 'select',
      required: true,
      options: [
        { label: 'Ok', value: 'ok' },
        { label: 'Alerta', value: 'alerta' },
        { label: 'Falha', value: 'falha' },
      ],
    },
    { name: 'detalhe', type: 'text' },
    { name: 'dados', type: 'json' },
  ],
}
