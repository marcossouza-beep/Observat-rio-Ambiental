import type { CollectionConfig } from 'payload'
import { equipe } from '../access'
import { estadoDaFonte, situacaoFonte } from '../lib/fontes'

const soEquipe = { read: equipe, create: equipe, update: equipe, delete: equipe }

export const Fontes: CollectionConfig = {
  slug: 'fontes',
  typescript: { interface: 'Fonte' },
  labels: { singular: 'Fonte', plural: 'Fontes' },
  admin: { group: 'Sistema', useAsTitle: 'nome', defaultColumns: ['nome', 'nivel', 'ultimaColetaOk', 'situacao', 'ativa'] },
  access: { ...soEquipe, read: () => true },
  hooks: {
    // O registro das coletas é da fonte: sai junto.
    beforeDelete: [async ({ id, req }) => void (await req.payload.delete({ collection: 'coletas', where: { fonte: { equals: id } }, req }))],
  },
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
    { name: 'url', label: 'Endereço', type: 'text', admin: { description: 'Onde a fonte publica (página, API ou diário).' } },
    {
      name: 'levantamento',
      label: 'Levantamento (Fase 4)',
      type: 'group',
      admin: { description: 'Preenchido pela sondagem automática (pnpm levantamento:fontes). Ver docs/LEVANTAMENTO.md.' },
      fields: [
        { name: 'motivo', label: 'Por que este nível', type: 'textarea', admin: { readOnly: true } },
        { name: 'verificadoEm', label: 'Verificado em', type: 'date', admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } } },
      ],
    },
    { name: 'frequencia', type: 'text', defaultValue: '6h, 12h, 18h, 23h' },
    {
      name: 'toleranciaHoras',
      label: 'Tolerância sem coleta (horas)',
      type: 'number',
      min: 1,
      admin: {
        description:
          'Depois disso a fonte aparece como atrasada e a equipe recebe e-mail. Vazio: 8 horas nas federais; 48 horas úteis nas estaduais (sem fim de semana nem recesso).',
      },
    },
    { name: 'manual', label: 'Cadastro manual (nível D)', type: 'checkbox', defaultValue: false },
    { name: 'ativa', type: 'checkbox', defaultValue: true },
    { name: 'ultimaColeta', type: 'date', admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'ultimaColetaOk', label: 'Última coleta bem-sucedida', type: 'date', admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'itensUltimaColeta', type: 'number', admin: { readOnly: true } },
    { name: 'mediaItens30d', label: 'Média de itens (30 dias)', type: 'number', admin: { readOnly: true } },
    { name: 'erro', label: 'Último erro', type: 'textarea', admin: { readOnly: true } },
    { name: 'falhasSeguidas', label: 'Coletas seguidas com falha', type: 'number', defaultValue: 0, admin: { readOnly: true } },
    { name: 'alertaEnviadoEm', label: 'Aviso à equipe enviado em', type: 'date', admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } } },
    {
      name: 'situacao',
      type: 'text',
      virtual: true,
      admin: { readOnly: true },
      hooks: {
        afterRead: [
          ({ siblingData }) => situacaoFonte(estadoDaFonte(siblingData), new Date()),
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

export const TIPOS_ALERTA = [
  { label: 'Entrou na pauta', value: 'pauta' },
  { label: 'Urgência aprovada', value: 'urgencia' },
  { label: 'Substitutivo', value: 'substitutivo' },
  { label: 'Votação', value: 'votacao' },
  { label: 'Aprovação', value: 'aprovacao' },
  { label: 'Sanção', value: 'sancao' },
  { label: 'Veto', value: 'veto' },
  { label: 'Nova versão do texto', value: 'nova_versao' },
  { label: 'Mudou de situação', value: 'situacao' },
]

/** Radar: o que mudou nas propostas acompanhadas, para o autor decidir a pauta. Só o painel vê. */
export const Alertas: CollectionConfig = {
  slug: 'alertas',
  typescript: { interface: 'Alerta' },
  labels: { singular: 'Alerta do Radar', plural: 'Radar' },
  admin: { group: 'Trabalho', useAsTitle: 'titulo', defaultColumns: ['data', 'tipo', 'titulo', 'proposicao', 'visto'] },
  access: soEquipe,
  defaultSort: '-data',
  fields: [
    { name: 'proposicao', label: 'Proposição', type: 'relationship', relationTo: 'proposicoes', required: true, index: true },
    { name: 'tipo', type: 'select', required: true, options: TIPOS_ALERTA, index: true },
    { name: 'titulo', label: 'O que aconteceu', type: 'text', required: true },
    { name: 'data', type: 'date', required: true, index: true, admin: { date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'link', type: 'text' },
    { name: 'visto', type: 'checkbox', defaultValue: false, index: true },
    { name: 'chave', type: 'text', unique: true, index: true, admin: { readOnly: true, description: 'Evita alerta repetido' } },
  ],
}
