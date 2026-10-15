import type { CollectionConfig } from 'payload'
import { equipe } from '../access'
import { abrirCompromisso, mudarCompromissos } from '../hooks/compromissos'
import { enfileirar, linkDescadastro, modelo } from '../lib/email'
import { SITE_URL } from '../lib/rotulos'

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
  typescript: { interface: 'Assinante' },
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
    { name: 'seguirParlamentares', label: 'Parlamentares que segue', type: 'relationship', relationTo: 'parlamentares', hasMany: true },
    { name: 'avisarParecer', label: 'Pediu aviso de parecer', type: 'relationship', relationTo: 'proposicoes', hasMany: true },
    {
      type: 'row',
      fields: [
        { name: 'aceitaEmails', label: 'Aceita e-mails do observatório', type: 'checkbox', defaultValue: true },
        { name: 'alertas', label: 'Alerta diário das leis que segue', type: 'checkbox', defaultValue: false },
        { name: 'resumoSemanal', label: 'Resumo semanal', type: 'checkbox', defaultValue: false },
      ],
    },
    { name: 'consentimentoEm', type: 'date', required: true },
    { name: 'confirmadoEm', label: 'E-mail confirmado em', type: 'date' },
    { name: 'origemProposicao', type: 'relationship', relationTo: 'proposicoes' },
    // Link mágico: só o resumo do token e a validade; nunca visível pela API.
    { name: 'tokenHash', type: 'text', index: true, admin: { hidden: true }, access: { read: () => false, update: () => false, create: () => false } },
    { name: 'tokenExpira', type: 'date', admin: { hidden: true }, access: { read: () => false, update: () => false, create: () => false } },
  ],
}

export const Credenciamentos: CollectionConfig = {
  slug: 'credenciamentos',
  typescript: { interface: 'Credenciamento' },
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
        if (['verificado', 'recusado', 'mais_info'].includes(doc.status)) {
          const aid = typeof doc.assinante === 'object' ? doc.assinante.id : doc.assinante
          const a = await req.payload.findByID({ collection: 'assinantes', id: aid, req, depth: 0 })
          const textos: Record<string, [string, string[]]> = {
            verificado: ['Credenciamento de imprensa aprovado', ['Seu credenciamento foi verificado. Sua conta passa a aparecer como imprensa verificada.']],
            recusado: ['Credenciamento de imprensa', ['Não conseguimos confirmar seu vínculo com um veículo de imprensa.', doc.motivo ? `Motivo: ${doc.motivo}` : '', 'Você continua inscrito e recebe tudo o que os inscritos recebem.'].filter(Boolean)],
            mais_info: ['Precisamos de mais uma informação', ['Para concluir seu credenciamento de imprensa, precisamos de mais uma informação.', doc.motivo || '', 'Basta responder este e-mail.'].filter(Boolean)],
          }
          const [titulo, paragrafos] = textos[doc.status]
          const m = modelo({ titulo, paragrafos, botao: { texto: 'Abrir minha conta', url: `${SITE_URL}/conta` }, descadastro: linkDescadastro(a.id) })
          await enfileirar(req.payload, { tipo: 'resposta_pedido', para: a.email, assunto: titulo, ...m, assinante: a.id }, req)
        }
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
  typescript: { interface: 'Comunicado' },
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
        { label: 'Enviar (na próxima rodada, até 15 min)', value: 'agendado' },
        { label: 'Enviado para a fila', value: 'enviado' },
      ],
    },
    { name: 'agendadoPara', label: 'Enviar a partir de', type: 'date', admin: { date: { pickerAppearance: 'dayAndTime' }, description: 'Vazio = na próxima rodada' } },
    { name: 'totalPrevisto', label: 'Pessoas na fila', type: 'number', admin: { readOnly: true } },
    { name: 'enviadoEm', type: 'date', admin: { readOnly: true } },
  ],
}

export const Envios: CollectionConfig = {
  slug: 'envios',
  typescript: { interface: 'Envio' },
  labels: { singular: 'Envio de e-mail', plural: 'Envios de e-mail' },
  admin: { group: 'Público', useAsTitle: 'assunto', defaultColumns: ['assunto', 'para', 'tipo', 'status', 'createdAt'] },
  access: soEquipe,
  fields: [
    {
      name: 'tipo',
      type: 'select',
      required: true,
      options: ['acesso', 'aviso_publicacao', 'alerta', 'resumo', 'comunicado', 'resposta_pedido'].map((v) => ({ label: v.replace('_', ' '), value: v })),
    },
    { name: 'para', type: 'email', required: true },
    { name: 'assunto', type: 'text', required: true },
    { name: 'html', type: 'textarea', admin: { hidden: true } },
    { name: 'texto', type: 'textarea', admin: { readOnly: true } },
    { name: 'tentativas', type: 'number', defaultValue: 0, admin: { readOnly: true } },
    { name: 'assinante', label: 'Inscrito', type: 'relationship', relationTo: 'assinantes', index: true },
    { name: 'parecer', type: 'relationship', relationTo: 'pareceres' },
    { name: 'comunicado', type: 'relationship', relationTo: 'comunicados' },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'fila',
      index: true,
      options: ['fila', 'enviado', 'entregue', 'retorno', 'erro'].map((v) => ({ label: v, value: v })),
    },
    { name: 'erro', type: 'text' },
  ],
}
