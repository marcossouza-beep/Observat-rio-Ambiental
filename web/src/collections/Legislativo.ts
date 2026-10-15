import type { CollectionConfig } from 'payload'
import { equipe, publico } from '../access'
import { abrirCompromisso } from '../hooks/compromissos'
import { revalidarAoApagar, revalidarAoMudar } from '../hooks/revalidar'
import { slugify } from '../lib/texto'

const acesso = { read: publico, create: equipe, update: equipe, delete: equipe }
const revalidar = { afterChange: [revalidarAoMudar], afterDelete: [revalidarAoApagar] }
const chaveOrigem = {
  name: 'chaveOrigem',
  label: 'Identificador na fonte',
  type: 'text' as const,
  unique: true,
  index: true,
  admin: { position: 'sidebar' as const },
}
const proposicao = { name: 'proposicao', label: 'Proposição', type: 'relationship' as const, relationTo: 'proposicoes' as const, required: true, index: true }

export const Tramitacoes: CollectionConfig = {
  slug: 'tramitacoes',
  typescript: { interface: 'Tramitacao' },
  labels: { singular: 'Tramitação', plural: 'Tramitações' },
  admin: { group: 'Legislativo', useAsTitle: 'descricao', defaultColumns: ['data', 'proposicao', 'orgao', 'tipoEvento'] },
  access: acesso,
  defaultSort: '-data',
  hooks: revalidar,
  fields: [
    proposicao,
    { name: 'data', type: 'date', required: true, index: true },
    { name: 'orgao', label: 'Órgão', type: 'text' },
    { name: 'descricao', label: 'Descrição', type: 'textarea', required: true },
    {
      name: 'tipoEvento',
      type: 'select',
      defaultValue: 'outro',
      options: [
        'apresentacao',
        'pauta',
        'urgencia',
        'parecer_relator',
        'substitutivo',
        'votacao',
        'aprovacao',
        'sancao',
        'veto',
        'arquivamento',
        'outro',
      ].map((v) => ({ label: v.replace('_', ' '), value: v })),
    },
    { name: 'urlDocumento', label: 'Documento citado', type: 'text' },
    chaveOrigem,
  ],
}

/**
 * Versões do texto. Uma versão nova numa proposta com parecer publicado
 * marca o parecer como desatualizado e abre o compromisso de atualização.
 */
export const Versoes: CollectionConfig = {
  slug: 'versoes',
  typescript: { interface: 'Versao' },
  labels: { singular: 'Versão do texto', plural: 'Versões do texto' },
  admin: { group: 'Legislativo', useAsTitle: 'rotulo', defaultColumns: ['data', 'proposicao', 'tipo'] },
  access: acesso,
  defaultSort: '-data',
  hooks: {
    afterChange: [
      async ({ doc, operation, req }) => {
        if (operation !== 'create') return doc
        // Lei publicada repete a redação final; o veto, se houver, chega ao autor pelo Radar.
        if (doc.tipo === 'norma') return doc
        const propId = typeof doc.proposicao === 'object' ? doc.proposicao.id : doc.proposicao
        const pareceres = await req.payload.find({
          collection: 'pareceres',
          req,
          depth: 1,
          limit: 1,
          where: { proposicao: { equals: propId }, status: { equals: 'publicado' } },
        })
        const parecer = pareceres.docs[0]
        if (!parecer) return doc
        const analisada = parecer.versaoTexto && typeof parecer.versaoTexto === 'object' ? parecer.versaoTexto : null
        if ((analisada?.id ?? parecer.versaoTexto) === doc.id) return doc
        // Só texto posterior ao analisado conta. A coleta pode trazer versões antigas (histórico) que o autor já conhecia.
        const referencia = analisada?.data || parecer.atualizadoEm || parecer.publicadoEm
        if (referencia && new Date(doc.data).getTime() <= new Date(referencia).getTime()) return doc
        await req.payload.update({
          collection: 'pareceres',
          id: parecer.id,
          req,
          data: { desatualizadoDesde: parecer.desatualizadoDesde || new Date().toISOString() },
        })
        await abrirCompromisso(req, {
          tipo: 'atualizacao',
          alvo: 'pareceres',
          alvoId: parecer.id,
          proposicao: propId,
          descricao: `${doc.rotulo || 'nova versão'} de ${new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' }).format(new Date(doc.data))}`,
        })
        return doc
      },
      revalidarAoMudar,
    ],
    afterDelete: [revalidarAoApagar],
  },
  fields: [
    proposicao,
    { name: 'data', type: 'date', required: true },
    {
      name: 'tipo',
      type: 'select',
      defaultValue: 'original',
      options: [
        { label: 'Texto original', value: 'original' },
        { label: 'Substitutivo', value: 'substitutivo' },
        { label: 'Parecer do relator', value: 'parecer_relator' },
        { label: 'Emenda aglutinativa', value: 'emenda_aglutinativa' },
        { label: 'Redação final', value: 'redacao_final' },
        { label: 'Texto enviado à outra casa', value: 'autografo' },
        { label: 'Lei / norma publicada', value: 'norma' },
      ],
    },
    { name: 'rotulo', label: 'Rótulo', type: 'text', admin: { description: 'Ex.: Substitutivo do relator (Plenário)' } },
    { name: 'url', label: 'Arquivo oficial', type: 'text' },
    { name: 'texto', label: 'Texto extraído', type: 'textarea' },
    { name: 'extraidoPorOcr', type: 'checkbox', defaultValue: false },
    { name: 'semTextoMotivo', label: 'Por que não há texto', type: 'text', admin: { readOnly: true } },
    { name: 'tentativasTexto', label: 'Tentativas de leitura', type: 'number', defaultValue: 0, admin: { readOnly: true } },
    { name: 'hash', label: 'Resumo do arquivo (para detectar mudança)', type: 'text', index: true, admin: { readOnly: true } },
    chaveOrigem,
  ],
}

export const Parlamentares: CollectionConfig = {
  slug: 'parlamentares',
  typescript: { interface: 'Parlamentar' },
  labels: { singular: 'Parlamentar', plural: 'Parlamentares' },
  admin: { group: 'Legislativo', useAsTitle: 'nome', defaultColumns: ['nome', 'partido', 'uf', 'casa'] },
  access: acesso,
  hooks: {
    beforeValidate: [
      ({ data }) => (data && !data.slug && data.nome ? { ...data, slug: slugify(`${data.nome} ${data.partido || ''} ${data.uf || ''}`) } : data),
    ],
  },
  fields: [
    { name: 'nome', type: 'text', required: true },
    { name: 'slug', type: 'text', unique: true, index: true },
    {
      type: 'row',
      fields: [
        { name: 'partido', type: 'text' },
        { name: 'uf', label: 'UF', type: 'text', maxLength: 2 },
        {
          name: 'casa',
          type: 'select',
          options: [
            { label: 'Câmara dos Deputados', value: 'camara' },
            { label: 'Senado Federal', value: 'senado' },
            { label: 'Assembleia Legislativa', value: 'assembleia' },
          ],
        },
      ],
    },
    { name: 'fotoUrl', type: 'text' },
    { name: 'emExercicio', type: 'checkbox', defaultValue: true },
    chaveOrigem,
  ],
}

export const Votacoes: CollectionConfig = {
  slug: 'votacoes',
  typescript: { interface: 'Votacao' },
  labels: { singular: 'Votação', plural: 'Votações' },
  admin: { group: 'Legislativo', useAsTitle: 'descricao', defaultColumns: ['data', 'proposicao', 'orgao', 'resultado'] },
  access: acesso,
  hooks: revalidar,
  defaultSort: '-data',
  fields: [
    proposicao,
    { name: 'data', type: 'date', required: true },
    { name: 'orgao', label: 'Órgão', type: 'text' },
    { name: 'descricao', label: 'Descrição', type: 'text' },
    { name: 'resultado', type: 'text' },
    {
      type: 'row',
      fields: [
        { name: 'placarSim', label: 'Sim', type: 'number' },
        { name: 'placarNao', label: 'Não', type: 'number' },
        { name: 'placarAbstencao', label: 'Abstenção', type: 'number' },
      ],
    },
    { name: 'votosNominaisPublicados', type: 'checkbox', defaultValue: false, admin: { description: 'Falso enquanto a casa não publicar os votos individuais' } },
    {
      name: 'orientacoes',
      type: 'array',
      fields: [
        { name: 'bancada', type: 'text' },
        { name: 'orientacao', type: 'text' },
      ],
    },
    chaveOrigem,
  ],
}

export const Votos: CollectionConfig = {
  slug: 'votos',
  typescript: { interface: 'Voto' },
  labels: { singular: 'Voto', plural: 'Votos' },
  admin: { group: 'Legislativo', defaultColumns: ['votacao', 'parlamentar', 'voto'] },
  access: acesso,
  fields: [
    { name: 'votacao', label: 'Votação', type: 'relationship', relationTo: 'votacoes', required: true, index: true },
    { name: 'parlamentar', type: 'relationship', relationTo: 'parlamentares', required: true, index: true },
    {
      name: 'voto',
      type: 'select',
      required: true,
      options: [
        { label: 'Sim', value: 'sim' },
        { label: 'Não', value: 'nao' },
        { label: 'Abstenção', value: 'abstencao' },
        { label: 'Obstrução', value: 'obstrucao' },
        { label: 'Ausente', value: 'ausente' },
        { label: 'Outro', value: 'outro' },
      ],
    },
    { name: 'chave', type: 'text', unique: true, index: true, admin: { readOnly: true, description: 'votação:parlamentar' } },
  ],
  hooks: {
    beforeChange: [
      ({ data }) => {
        const id = (v: unknown) => (v && typeof v === 'object' ? (v as { id: unknown }).id : v)
        if (data.votacao && data.parlamentar) data.chave = `${id(data.votacao)}:${id(data.parlamentar)}`
        return data
      },
    ],
  },
}

export const Emendas: CollectionConfig = {
  slug: 'emendas',
  typescript: { interface: 'Emenda' },
  labels: { singular: 'Emenda', plural: 'Emendas' },
  admin: { group: 'Legislativo', useAsTitle: 'numero', defaultColumns: ['numero', 'proposicao', 'parlamentar', 'data'] },
  access: acesso,
  hooks: revalidar,
  fields: [
    proposicao,
    { name: 'numero', label: 'Número', type: 'text' },
    { name: 'parlamentar', type: 'relationship', relationTo: 'parlamentares' },
    { name: 'data', type: 'date' },
    { name: 'resumo', type: 'textarea' },
    { name: 'url', type: 'text' },
    chaveOrigem,
  ],
}
