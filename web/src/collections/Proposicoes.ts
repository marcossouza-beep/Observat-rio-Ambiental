import type { CollectionConfig } from 'payload'
import { campoSoEquipe, equipe, proposicaoPublicaOuEquipe } from '../access'
import { abrirCompromisso, mudarCompromissos } from '../hooks/compromissos'
import { revalidarAoApagar, revalidarAoMudar } from '../hooks/revalidar'
import { rotuloProposicao, slugProposicao } from '../lib/texto'

export const SITUACOES_EDITORIAIS = [
  { label: 'Na triagem', value: 'triagem' },
  { label: 'Parecer prometido (ativa)', value: 'ativa' },
  { label: 'Acompanhando (sem parecer previsto)', value: 'monitorada' },
  { label: 'Descartada', value: 'descartada' },
]

export const Proposicoes: CollectionConfig = {
  slug: 'proposicoes',
  typescript: { interface: 'Proposicao' },
  labels: { singular: 'Proposição', plural: 'Proposições' },
  admin: {
    group: 'Trabalho',
    useAsTitle: 'rotulo',
    defaultColumns: ['rotulo', 'titulo', 'casa', 'statusSimplificado', 'situacaoEditorial', 'relevancia'],
    listSearchableFields: ['rotulo', 'titulo', 'ementa'],
  },
  access: { read: proposicaoPublicaOuEquipe, create: equipe, update: equipe, delete: equipe },
  hooks: {
    beforeChange: [
      ({ data, originalDoc }) => {
        if (data.sigla && data.numero && data.ano) {
          data.rotulo = rotuloProposicao(data.sigla, data.numero, data.ano)
          if (!data.slug) data.slug = slugProposicao(data.sigla, data.numero, data.ano, data.titulo || undefined)
        }
        if (data.situacaoEditorial === 'ativa' && originalDoc?.situacaoEditorial !== 'ativa') {
          data.ativadaEm = new Date().toISOString()
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, req, operation }) => {
        const antes = operation === 'create' ? undefined : previousDoc?.situacaoEditorial
        const agora = doc.situacaoEditorial
        if (agora === antes) return doc
        if (agora === 'ativa') {
          const prazo = await abrirCompromisso(req, {
            tipo: 'parecer_prometido',
            alvo: 'proposicoes',
            alvoId: doc.id,
            proposicao: doc.id,
            descricao: doc.titulo || doc.rotulo || String(doc.id),
            prazo: doc.prazoParecer || undefined,
          })
          if (doc.prazoParecer !== prazo) {
            await req.payload.update({ collection: 'proposicoes', id: doc.id, req, data: { prazoParecer: prazo }, context: { semGanchos: true } })
          }
        } else if (antes === 'ativa') {
          // Deixou de prometer parecer: o aviso público muda junto.
          await mudarCompromissos(req, { alvo: 'proposicoes', alvoId: doc.id, tipos: ['parecer_prometido'], status: 'retirado' })
        }
        return doc
      },
      revalidarAoMudar,
    ],
    afterDelete: [revalidarAoApagar],
  },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'sigla', type: 'text', required: true, admin: { width: '20%', description: 'PL, PLP, PEC, MPV, PDL, Decreto, Lei…' } },
        { name: 'numero', label: 'Número', type: 'number', required: true, admin: { width: '20%' } },
        { name: 'ano', type: 'number', required: true, admin: { width: '20%' } },
        { name: 'rotulo', label: 'Identificação', type: 'text', index: true, admin: { readOnly: true, width: '40%' } },
      ],
    },
    { name: 'titulo', label: 'Título curto', type: 'text', admin: { description: 'Nome editorial, em linguagem simples' } },
    { name: 'slug', label: 'Endereço', type: 'text', unique: true, index: true, admin: { description: 'Não muda depois de publicado' } },
    {
      type: 'row',
      fields: [
        {
          name: 'esfera',
          type: 'select',
          required: true,
          defaultValue: 'federal',
          options: [
            { label: 'Federal', value: 'federal' },
            { label: 'Estadual', value: 'estadual' },
            { label: 'Municipal', value: 'municipal' },
          ],
        },
        { name: 'uf', label: 'UF', type: 'text', maxLength: 2, admin: { description: 'Vazio para federal' } },
        {
          name: 'casa',
          type: 'select',
          options: [
            { label: 'Câmara dos Deputados', value: 'camara' },
            { label: 'Senado Federal', value: 'senado' },
            { label: 'Congresso Nacional', value: 'congresso' },
            { label: 'Presidência da República', value: 'presidencia' },
            { label: 'Assembleia Legislativa', value: 'assembleia' },
            { label: 'Câmara Municipal', value: 'camara_municipal' },
          ],
        },
      ],
    },
    { name: 'ementa', type: 'textarea' },
    { name: 'art1', label: 'Art. 1º', type: 'textarea' },
    {
      type: 'row',
      fields: [
        {
          name: 'statusSimplificado',
          label: 'Situação',
          type: 'select',
          defaultValue: 'em_tramitacao',
          options: [
            { label: 'Em tramitação', value: 'em_tramitacao' },
            { label: 'Aprovada', value: 'aprovada' },
            { label: 'Sancionada / virou norma', value: 'norma' },
            { label: 'Vetada', value: 'vetada' },
            { label: 'Arquivada', value: 'arquivada' },
            { label: 'Rejeitada', value: 'rejeitada' },
          ],
        },
        { name: 'statusOficial', label: 'Situação oficial', type: 'text' },
        { name: 'etapa', type: 'text', admin: { description: 'Ex.: Plenário, Comissões, Outra casa' } },
        {
          name: 'regime',
          type: 'select',
          defaultValue: 'normal',
          options: [
            { label: 'Normal', value: 'normal' },
            { label: 'Prioridade', value: 'prioridade' },
            { label: 'Urgência', value: 'urgencia' },
          ],
        },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'dataApresentacao', label: 'Apresentada em', type: 'date' },
        { name: 'ultimaMovimentacao', label: 'Última movimentação', type: 'date' },
      ],
    },
    { name: 'urlInteiroTeor', label: 'Inteiro teor (fonte oficial)', type: 'text' },
    { name: 'urlFonte', label: 'Página oficial', type: 'text' },
    {
      name: 'autoria',
      type: 'array',
      fields: [
        { name: 'parlamentar', type: 'relationship', relationTo: 'parlamentares' },
        { name: 'nomeLivre', label: 'Autor (se não for parlamentar)', type: 'text' },
        {
          name: 'papel',
          type: 'select',
          defaultValue: 'autor',
          options: [
            { label: 'Autor', value: 'autor' },
            { label: 'Coautor', value: 'coautor' },
            { label: 'Relator', value: 'relator' },
          ],
        },
        { name: 'orgao', label: 'Órgão', type: 'text' },
        { name: 'data', type: 'date' },
      ],
    },
    { name: 'temas', type: 'relationship', relationTo: 'temas', hasMany: true },
    { name: 'biomas', type: 'relationship', relationTo: 'biomas', hasMany: true },
    {
      name: 'situacaoEditorial',
      label: 'Situação editorial',
      type: 'select',
      required: true,
      defaultValue: 'triagem',
      options: SITUACOES_EDITORIAIS,
      admin: { position: 'sidebar' },
    },
    { name: 'prazoParecer', label: 'Parecer prometido para', type: 'date', admin: { position: 'sidebar', readOnly: true } },
    { name: 'ativadaEm', label: 'Ativada em', type: 'date', admin: { position: 'sidebar', readOnly: true }, access: { read: campoSoEquipe } },
    { name: 'relevancia', label: 'Nota de relevância', type: 'number', min: 0, max: 100, admin: { position: 'sidebar' }, access: { read: campoSoEquipe } },
    { name: 'termosEncontrados', label: 'Termos encontrados', type: 'text', hasMany: true, admin: { position: 'sidebar' }, access: { read: campoSoEquipe } },
    { name: 'motivoDescarte', type: 'text', admin: { position: 'sidebar', condition: (d) => d.situacaoEditorial === 'descartada' }, access: { read: campoSoEquipe } },
    { name: 'fonte', type: 'relationship', relationTo: 'fontes', admin: { position: 'sidebar' } },
    { name: 'chaveOrigem', label: 'Identificador na fonte', type: 'text', unique: true, index: true, admin: { position: 'sidebar', description: 'Ex.: camara:2345678' } },
    {
      name: 'origem',
      type: 'select',
      defaultValue: 'manual',
      options: [
        { label: 'Coleta automática', value: 'api' },
        { label: 'Cadastro manual', value: 'manual' },
      ],
      admin: { position: 'sidebar' },
    },
  ],
}
