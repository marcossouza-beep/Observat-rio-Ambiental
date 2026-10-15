import type { CollectionConfig } from 'payload'
import { equipe } from '../access'
import { abrirCompromisso, mudarCompromissos } from '../hooks/compromissos'

const soEquipe = { read: equipe, create: equipe, update: equipe, delete: equipe }

export const PERFIS = [
  'Advogado(a)',
  'Estudante',
  'Servidor(a) público(a)',
  'Empresa',
  'ONG / movimento',
  'Pesquisador(a)',
  'Jornalista',
  'Cidadão(ã)',
] as const

export const SUBPERFIS: Record<string, string[]> = {
  'Advogado(a)': ['Advocacia privada', 'Advocacia pública', 'Jurídico de empresa', 'Consultoria ambiental'],
  'Servidor(a) público(a)': ['Órgão ambiental', 'Ministério Público', 'Defensoria', 'Judiciário', 'Legislativo', 'Outro órgão'],
  Empresa: ['Agropecuária', 'Mineração', 'Energia', 'Saneamento', 'Indústria', 'Consultoria ambiental'],
  'ONG / movimento': ['Meio ambiente', 'Povos e comunidades', 'Direitos e cidadania', 'Outro foco'],
  'Pesquisador(a)': ['Direito', 'Ciências ambientais e biológicas', 'Ciências agrárias', 'Engenharias', 'Ciências humanas e sociais'],
  'Cidadão(ã)': ['Interesse geral', 'Produtor(a) rural', 'Moro em área afetada', 'Professor(a) da educação básica'],
}

export const Assinantes: CollectionConfig = {
  slug: 'assinantes',
  labels: { singular: 'Inscrito', plural: 'Inscritos' },
  admin: { group: 'Público', useAsTitle: 'email', defaultColumns: ['email', 'nome', 'perfil', 'subperfil', 'uf', 'confirmadoEm'] },
  access: soEquipe,
  fields: [
    { name: 'nome', type: 'text' },
    { name: 'email', type: 'email', required: true, unique: true, index: true },
    {
      type: 'row',
      fields: [
        { name: 'perfil', type: 'select', options: PERFIS.map((p) => ({ label: p, value: p })) },
        { name: 'subperfil', type: 'text', admin: { description: 'Vazio para estudante; pedido na conta se faltar' } },
        { name: 'curso', type: 'text', admin: { condition: (d) => d.perfil === 'Estudante' } },
        { name: 'uf', label: 'UF', type: 'text', maxLength: 2 },
      ],
    },
    { name: 'temas', type: 'relationship', relationTo: 'temas', hasMany: true },
    { name: 'biomas', type: 'relationship', relationTo: 'biomas', hasMany: true },
    { name: 'seguindo', label: 'Leis que segue', type: 'relationship', relationTo: 'proposicoes', hasMany: true },
    { name: 'avisarParecer', label: 'Pediu aviso de parecer', type: 'relationship', relationTo: 'proposicoes', hasMany: true },
    {
      type: 'row',
      fields: [
        { name: 'aceitaEmails', label: 'Aceita e-mails do observatório', type: 'checkbox', defaultValue: true },
        { name: 'alertas', label: 'Alertas de tramitação', type: 'checkbox', defaultValue: true },
        { name: 'resumoSemanal', type: 'checkbox', defaultValue: true },
      ],
    },
    { name: 'consentimentoEm', type: 'date', required: true },
    { name: 'confirmadoEm', type: 'date' },
    { name: 'origemProposicao', type: 'relationship', relationTo: 'proposicoes' },
  ],
}

export const Credenciamentos: CollectionConfig = {
  slug: 'credenciamentos',
  labels: { singular: 'Credenciamento de imprensa', plural: 'Credenciamentos de imprensa' },
  admin: { group: 'Público', useAsTitle: 'veiculo', defaultColumns: ['veiculo', 'assinante', 'status', 'createdAt'] },
  access: soEquipe,
  hooks: {
    beforeChange: [
      ({ data, originalDoc, req }) => {
        if (data.status !== originalDoc?.status && ['verificado', 'recusado'].includes(data.status)) {
          data.verificadoEm = new Date().toISOString()
          if (req.user) data.verificadoPor = req.user.id
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, operation, req }) => {
        if (operation === 'create') {
          await abrirCompromisso(req, { tipo: 'credenciamento', alvo: 'credenciamentos', alvoId: doc.id, descricao: doc.veiculo })
          return doc
        }
        if (doc.status === previousDoc?.status) return doc
        if (doc.status === 'mais_info') await mudarCompromissos(req, { alvo: 'credenciamentos', alvoId: doc.id, status: 'suspenso' })
        else if (doc.status === 'em_analise') await mudarCompromissos(req, { alvo: 'credenciamentos', alvoId: doc.id, status: 'aberto' })
        else await mudarCompromissos(req, { alvo: 'credenciamentos', alvoId: doc.id, status: 'cumprido' })
        return doc
      },
    ],
  },
  fields: [
    { name: 'assinante', label: 'Inscrito', type: 'relationship', relationTo: 'assinantes', required: true },
    { name: 'veiculo', label: 'Veículo', type: 'text', required: true },
    { name: 'tipoVeiculo', type: 'text' },
    { name: 'funcao', label: 'Função', type: 'text' },
    { name: 'linkComprovacao', type: 'text', required: true },
    { name: 'emailProfissional', type: 'email' },
    { name: 'registroMtb', label: 'Registro MTb', type: 'text' },
    { name: 'autorizaVerificacao', type: 'checkbox', required: true },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'em_analise',
      options: [
        { label: 'Em análise', value: 'em_analise' },
        { label: 'Pedimos mais informações', value: 'mais_info' },
        { label: 'Verificado', value: 'verificado' },
        { label: 'Recusado', value: 'recusado' },
      ],
    },
    { name: 'motivo', type: 'textarea', admin: { condition: (d) => ['recusado', 'mais_info'].includes(d.status) } },
    { name: 'verificadoPor', type: 'relationship', relationTo: 'users', admin: { readOnly: true } },
    { name: 'verificadoEm', type: 'date', admin: { readOnly: true } },
  ],
}

export const Comunicados: CollectionConfig = {
  slug: 'comunicados',
  labels: { singular: 'Comunicado', plural: 'Comunicados' },
  admin: { group: 'Público', useAsTitle: 'assunto', defaultColumns: ['assunto', 'status', 'totalPrevisto', 'enviadoEm'] },
  access: soEquipe,
  fields: [
    { name: 'assunto', type: 'text', required: true },
    { name: 'mensagem', type: 'textarea', required: true, admin: { description: 'Use {nome} para personalizar' } },
    { name: 'perfis', type: 'select', hasMany: true, options: PERFIS.map((p) => ({ label: p, value: p })), admin: { description: 'Vazio = todos' } },
    { name: 'subperfis', type: 'text', hasMany: true, admin: { description: 'Subgrupos (ou cursos, para estudantes). Vazio = perfil inteiro' } },
    { name: 'uf', label: 'UF', type: 'text', maxLength: 2 },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'rascunho',
      options: [
        { label: 'Rascunho', value: 'rascunho' },
        { label: 'Agendado', value: 'agendado' },
        { label: 'Enviando', value: 'enviando' },
        { label: 'Enviado', value: 'enviado' },
      ],
    },
    { name: 'agendadoPara', type: 'date', admin: { date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'totalPrevisto', type: 'number', admin: { readOnly: true } },
    { name: 'enviadoEm', type: 'date', admin: { readOnly: true } },
  ],
}

export const Envios: CollectionConfig = {
  slug: 'envios',
  labels: { singular: 'Envio de e-mail', plural: 'Envios de e-mail' },
  admin: { group: 'Público', defaultColumns: ['tipo', 'assinante', 'status', 'createdAt'] },
  access: soEquipe,
  fields: [
    {
      name: 'tipo',
      type: 'select',
      required: true,
      options: ['acesso', 'aviso_publicacao', 'alerta', 'resumo', 'embargo', 'comunicado', 'resposta_pedido'].map((v) => ({ label: v.replace('_', ' '), value: v })),
    },
    { name: 'assinante', label: 'Inscrito', type: 'relationship', relationTo: 'assinantes', index: true },
    { name: 'parecer', type: 'relationship', relationTo: 'pareceres' },
    { name: 'comunicado', type: 'relationship', relationTo: 'comunicados' },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'fila',
      options: ['fila', 'enviado', 'entregue', 'retorno', 'erro'].map((v) => ({ label: v, value: v })),
    },
    { name: 'erro', type: 'text' },
  ],
}
