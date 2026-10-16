import { APIError, type CollectionConfig } from 'payload'
import { campoSoEquipe, equipe, proposicaoPublicaOuEquipe } from '../access'
import { abrirCompromisso, mudarCompromissos } from '../hooks/compromissos'
import { revalidarAoApagar, revalidarAoMudar } from '../hooks/revalidar'
import { leisCitadas } from '../lib/leis'
import { casaDeOrigem } from '../lib/panorama'
import { pontuar, type Termo } from '../lib/relevancia'
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
      async ({ data, originalDoc, req }) => {
        // Nota de relevância pelo dicionário de palavras-chave, quando o texto de busca muda.
        const texto = [data.titulo, data.ementa, data.art1].filter(Boolean).join(' ')
        const anterior = [originalDoc?.titulo, originalDoc?.ementa, originalDoc?.art1].filter(Boolean).join(' ')
        if (texto && (texto !== anterior || data.relevancia == null)) {
          const dic = await req.payload.find({ collection: 'palavras-chave', limit: 1000, depth: 0, req, pagination: false })
          // Palavra de um estado só conta nas propostas daquele estado
          const esfera = data.esfera ?? originalDoc?.esfera
          const uf = esfera === 'estadual' ? (data.uf ?? originalDoc?.uf)?.toUpperCase() : undefined
          const termos = dic.docs.filter((d) => !d.uf || d.uf.toUpperCase() === uf)
          const r = pontuar(texto, termos.map((d) => ({ termo: d.termo, peso: d.peso, exclusao: !!d.exclusao, grupo: d.grupo || undefined }) as Termo))
          data.relevancia = r.nota
          data.termosEncontrados = r.encontrados
        }
        // Leis que a proposta altera (pela ementa), com link para o LexML
        if (data.ementa !== undefined && (data.ementa !== originalDoc?.ementa || !originalDoc?.leisAfetadas?.length)) {
          data.leisAfetadas = leisCitadas(data.ementa).map((l) => ({ rotulo: l.rotulo, url: l.url, urn: l.urn }))
        }
        if (data.sigla && data.numero && data.ano) {
          data.rotulo = rotuloProposicao(data.sigla, data.numero, data.ano)
          if (!data.slug) {
            // Proposta estadual leva a UF no endereço: o PL 77/2026 de Tocantins não colide com o federal nem com o de outro estado
            const esfera = data.esfera ?? originalDoc?.esfera
            const uf = data.uf ?? originalDoc?.uf
            const sigla = esfera === 'estadual' && uf ? `${uf} ${data.sigla}` : data.sigla
            data.slug = slugProposicao(sigla, data.numero, data.ano, data.titulo || undefined)
          }
        }
        // Casa de origem (para o padrão de atuação por casa); fica a que o autor escolher, se escolher.
        if (!data.casaOrigem && !originalDoc?.casaOrigem) {
          const v = (k: string) => (data[k] !== undefined ? data[k] : originalDoc?.[k])
          data.casaOrigem = casaDeOrigem({ esfera: v('esfera'), sigla: v('sigla'), chaveOrigem: v('chaveOrigem'), casa: v('casa') })
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
    beforeDelete: [
      // Apagar uma proposição leva junto o que é dela (andamentos, versões, votações, Radar).
      // Com parecer, não: o parecer é do autor e precisa ser apagado de propósito antes.
      async ({ id, req }) => {
        const pareceres = await req.payload.count({ collection: 'pareceres', where: { proposicao: { equals: id } }, req })
        if (pareceres.totalDocs) throw new APIError('Esta proposição tem parecer. Apague o parecer antes de apagar a proposição.', 400, null, true)
        const votacoes = await req.payload.find({ collection: 'votacoes', where: { proposicao: { equals: id } }, limit: 0, depth: 0, req, select: {} })
        const ids = votacoes.docs.map((v) => v.id)
        if (ids.length) await req.payload.delete({ collection: 'votos', where: { votacao: { in: ids } }, req })
        for (const c of ['votacoes', 'tramitacoes', 'versoes', 'emendas', 'alertas'] as const)
          await req.payload.delete({ collection: c, where: { proposicao: { equals: id } }, req, context: { semRevalidar: true } })
      },
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
    {
      name: 'leisAfetadas',
      label: 'Leis citadas na ementa',
      type: 'array',
      admin: { readOnly: true, description: 'Preenchido sozinho a partir da ementa, com link para o LexML' },
      fields: [
        { name: 'rotulo', type: 'text' },
        { name: 'url', type: 'text' },
        { name: 'urn', type: 'text' },
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
    {
      name: 'casaOrigem',
      label: 'Casa de origem',
      type: 'select',
      options: [
        { label: 'Câmara dos Deputados', value: 'camara' },
        { label: 'Senado Federal', value: 'senado' },
        { label: 'Congresso Nacional', value: 'congresso' },
        { label: 'Presidência da República', value: 'presidencia' },
      ],
      admin: { position: 'sidebar', description: 'Só federal. Preenchida sozinha (pela fonte ou pela sigla MPV); usada no padrão de atuação por casa.', condition: (d) => d.esfera === 'federal' },
    },
    { name: 'chaveOrigem', label: 'Identificador na fonte', type: 'text', unique: true, index: true, admin: { position: 'sidebar', description: 'Ex.: camara:2345678' } },
    {
      name: 'chavesExtras',
      label: 'Outros identificadores',
      type: 'text',
      hasMany: true,
      index: true,
      admin: { position: 'sidebar', readOnly: true, description: 'A mesma proposta na outra casa (ex.: senado:8079566)' },
      access: { read: campoSoEquipe },
    },
    { name: 'temasOficiais', label: 'Temas oficiais da casa', type: 'text', hasMany: true, admin: { position: 'sidebar', readOnly: true }, access: { read: campoSoEquipe } },
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
