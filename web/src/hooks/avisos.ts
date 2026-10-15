import type { PayloadRequest, Where } from 'payload'
import { enfileirar, linkDescadastro, modelo } from '../lib/email'
import { SITE_URL } from '../lib/rotulos'
import { textoDe } from '../lib/publicacao'

const idDe = (v: unknown) => (v && typeof v === 'object' ? (v as { id: number }).id : (v as number))

/**
 * Parecer publicado: e-mail para quem pediu "Avise-me" e para quem segue a lei.
 * Nova versão (texto mudou): só para quem segue. Quem pediu aviso sai da lista depois de avisado.
 */
export async function avisarPublicacao(req: PayloadRequest, parecer: { id: number; slug?: string | null; titulo?: string | null; proposicao: unknown; secoes?: { resumo?: unknown } | null }, novaVersao: boolean) {
  const propId = idDe(parecer.proposicao)
  const where: Where = novaVersao
    ? { seguindo: { in: [propId] } }
    : { or: [{ avisarParecer: { in: [propId] } }, { seguindo: { in: [propId] } }] }
  const r = await req.payload.find({
    collection: 'assinantes',
    req,
    depth: 0,
    limit: 5000,
    pagination: false,
    where: { and: [where, { aceitaEmails: { equals: true } }, { confirmadoEm: { exists: true } }] },
  })
  if (!r.docs.length) return 0
  const prop = await req.payload.findByID({ collection: 'proposicoes', id: propId, req, depth: 0 })
  const url = `${SITE_URL}/pareceres/${parecer.slug}`
  const resumo = textoDe(parecer.secoes?.resumo)
  const assunto = novaVersao ? `Parecer atualizado: ${prop.rotulo}` : `Saiu o parecer: ${prop.rotulo}`
  for (const a of r.docs) {
    const m = modelo({
      titulo: novaVersao ? `O parecer sobre ${prop.rotulo} foi atualizado` : `Saiu o parecer sobre ${prop.rotulo}`,
      paragrafos: [prop.titulo || '', resumo].filter(Boolean),
      botao: { texto: 'Ler o parecer', url },
      descadastro: linkDescadastro(a.id),
    })
    await enfileirar(req.payload, { tipo: 'aviso_publicacao', para: a.email, assunto, ...m, assinante: a.id, parecer: parecer.id }, req)
    const avisar = (a.avisarParecer || []).map(idDe).filter((x) => x !== propId)
    if (avisar.length !== (a.avisarParecer || []).length) {
      await req.payload.update({ collection: 'assinantes', id: a.id, req, data: { avisarParecer: avisar } })
    }
  }
  return r.docs.length
}
