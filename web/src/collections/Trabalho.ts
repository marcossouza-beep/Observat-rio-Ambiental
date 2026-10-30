import type { CollectionConfig } from 'payload'
import { equipe, publico } from '../access'
import { TIPOS_COMPROMISSO, ROTULO_COMPROMISSO } from '../lib/compromissos'
import { abrirCompromisso, mudarCompromissos } from '../hooks/compromissos'
import { revalidarAoApagar, revalidarAoMudar } from '../hooks/revalidar'
import { enfileirar, modelo } from '../lib/email'

const soEquipe = { read: equipe, create: equipe, update: equipe, delete: equipe }

export const Compromissos: CollectionConfig = {
  slug: 'compromissos',
  typescript: { interface: 'Compromisso' },
  labels: { singular: 'Compromisso', plural: 'Compromissos' },
  admin: {
    group: 'Trabalho',
    useAsTitle: 'descricao',
    defaultColumns: ['descricao', 'prazoEm', 'status', 'tipo'],
    description: 'Toda promessa pública com prazo. Nasce sozinha; fecha quando a promessa é cumprida ou retirada.',
  },
  access: soEquipe,
  defaultSort: 'prazoEm',
  fields: [
    { name: 'tipo', type: 'select', required: true, options: TIPOS_COMPROMISSO.map((t) => ({ label: ROTULO_COMPROMISSO[t], value: t })) },
    { name: 'descricao', label: 'Descrição', type: 'text', required: true },
    {
      type: 'row',
      fields: [
        {
          name: 'alvo',
          type: 'select',
          required: true,
          options: [
            { label: 'Proposição', value: 'proposicoes' },
            { label: 'Resumo prévio', value: 'pareceres' },
            { label: 'Pedido', value: 'pedidos' },
            { label: 'Credenciamento', value: 'credenciamentos' },
          ],
        },
        { name: 'alvoId', type: 'text', required: true, index: true },
      ],
    },
    { name: 'proposicao', label: 'Proposição', type: 'relationship', relationTo: 'proposicoes' },
    {
      type: 'row',
      fields: [
        { name: 'abertoEm', type: 'date', required: true },
        { name: 'prazoEm', label: 'Prazo', type: 'date', required: true, index: true },
        { name: 'encerradoEm', type: 'date' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'aberto',
      index: true,
      options: [
        { label: 'Aberto', value: 'aberto' },
        { label: 'Suspenso (aguardando resposta)', value: 'suspenso' },
        { label: 'Cumprido', value: 'cumprido' },
        { label: 'Retirado', value: 'retirado' },
      ],
    },
  ],
}

/** Pedidos do público com prazo: correções e dados pessoais (LGPD). */
export const Pedidos: CollectionConfig = {
  slug: 'pedidos',
  typescript: { interface: 'Pedido' },
  labels: { singular: 'Pedido', plural: 'Pedidos' },
  admin: { group: 'Trabalho', useAsTitle: 'resumo', defaultColumns: ['resumo', 'tipo', 'decisao', 'createdAt'] },
  access: soEquipe,
  hooks: {
    beforeChange: [
      ({ data, originalDoc }) => {
        data.resumo = (data.texto || '').slice(0, 80)
        if (data.decisao && data.decisao !== 'pendente' && !originalDoc?.respondidoEm) data.respondidoEm = new Date().toISOString()
        return data
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, operation, req }) => {
        const tipo = doc.tipo === 'lgpd' ? 'lgpd' : doc.tipo === 'correcao' ? 'correcao' : null
        if (!tipo) return doc
        if (operation === 'create' && doc.decisao === 'pendente') {
          await abrirCompromisso(req, { tipo, alvo: 'pedidos', alvoId: doc.id, descricao: doc.resumo || '' })
        } else if (doc.decisao !== 'pendente' && previousDoc?.decisao === 'pendente') {
          await mudarCompromissos(req, { alvo: 'pedidos', alvoId: doc.id, status: 'cumprido' })
        }
        // A resposta escrita no painel vai por e-mail à pessoa (uma vez, quando a decisão é tomada).
        if (doc.decisao !== 'pendente' && previousDoc?.decisao === 'pendente' && doc.resposta?.trim() && doc.email) {
          const m = modelo({ titulo: doc.tipo === 'lgpd' ? 'Seu pedido sobre dados pessoais' : 'Resposta ao seu pedido de correção', paragrafos: doc.resposta.trim().split(/\n{2,}/) })
          await enfileirar(req.payload, { tipo: 'resposta_pedido', para: doc.email, assunto: doc.tipo === 'lgpd' ? 'Seu pedido sobre dados pessoais' : 'Resposta ao seu pedido de correção', ...m }, req)
        }
        // Correção que procede vira registro público no parecer e na página de Correções (uma vez só).
        const parecerId = doc.parecer && typeof doc.parecer === 'object' ? doc.parecer.id : doc.parecer
        if (doc.tipo === 'correcao' && doc.decisao === 'procede' && parecerId && doc.correcaoPublica?.trim() && !doc.correcao) {
          const c = await req.payload.create({
            collection: 'correcoes',
            req,
            data: { parecer: parecerId, descricao: doc.correcaoPublica.trim(), pedido: doc.id, feitaEm: new Date().toISOString() },
          })
          await req.payload.update({ collection: 'pedidos', id: doc.id, req, data: { correcao: c.id } })
        }
        return doc
      },
    ],
  },
  fields: [
    {
      name: 'tipo',
      type: 'select',
      required: true,
      options: [
        { label: 'Correção', value: 'correcao' },
        { label: 'Dados pessoais (LGPD)', value: 'lgpd' },
        { label: 'Outro', value: 'outro' },
      ],
    },
    { name: 'resumo', type: 'text', admin: { readOnly: true } },
    { name: 'nome', type: 'text' },
    { name: 'email', type: 'email', required: true },
    { name: 'parecer', type: 'relationship', relationTo: 'pareceres' },
    { name: 'texto', label: 'Pedido', type: 'textarea', required: true },
    {
      name: 'decisao',
      label: 'Decisão',
      type: 'select',
      defaultValue: 'pendente',
      options: [
        { label: 'Pendente', value: 'pendente' },
        { label: 'Procede', value: 'procede' },
        { label: 'Não procede', value: 'nao_procede' },
        { label: 'Atendido (LGPD)', value: 'atendido' },
      ],
    },
    { name: 'resposta', label: 'Resposta à pessoa (e-mail)', type: 'textarea' },
    {
      name: 'correcaoPublica',
      label: 'O que foi corrigido (registro público)',
      type: 'text',
      admin: {
        condition: (d) => d.tipo === 'correcao' && d.decisao === 'procede',
        description: 'Aparece no rodapé do resumo prévio e na página de Correções. Ex.: "Placar da votação na Comissão corrigido para 21 a 12."',
      },
    },
    { name: 'correcao', label: 'Correção registrada', type: 'relationship', relationTo: 'correcoes', admin: { readOnly: true, condition: (d) => !!d.correcao } },
    { name: 'respondidoEm', type: 'date', admin: { readOnly: true } },
  ],
}

/** Registro público de correções, exibido no parecer e na página de Correções. */
export const Correcoes: CollectionConfig = {
  slug: 'correcoes',
  typescript: { interface: 'Correcao' },
  labels: { singular: 'Correção', plural: 'Correções' },
  admin: { group: 'Trabalho', useAsTitle: 'descricao', defaultColumns: ['descricao', 'parecer', 'feitaEm'] },
  access: { read: publico, create: equipe, update: equipe, delete: equipe },
  defaultSort: '-feitaEm',
  hooks: { afterChange: [revalidarAoMudar], afterDelete: [revalidarAoApagar] },
  fields: [
    { name: 'parecer', type: 'relationship', relationTo: 'pareceres', required: true },
    { name: 'descricao', label: 'O que foi corrigido', type: 'text', required: true },
    { name: 'feitaEm', type: 'date', required: true, defaultValue: () => new Date().toISOString() },
    { name: 'pedido', type: 'relationship', relationTo: 'pedidos', access: { read: ({ req: { user } }) => !!user } },
  ],
}
