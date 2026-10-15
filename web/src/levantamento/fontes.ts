/**
 * Registra no painel (coleção Fontes) as 54 fontes estaduais do levantamento: 27 casas legislativas e 27 Diários Oficiais,
 * com o nível A–D e o motivo. Ficam desligadas (ativa = false) até cada conector existir; nível D fica marcado como manual.
 * Em fontes já cadastradas, atualiza só o nível, o endereço e o registro do levantamento.
 * Fonte com conector pronto (hoje, as Assembleias do Norte com SAPL) fica ligada e com o conector marcado.
 * Isso só acontece quando o conector chega; se o autor desligar depois, uma nova sondagem não religa.
 *
 * Uso: pnpm levantamento:fontes   (lê levantamento/resultado.json)
 */
import type { Payload } from 'payload'
import { CONECTORES_SAPL } from '../coleta/sapl/conector'
import { classificar } from './classificacao'
import type { Resultado } from './sondar'

export const slugFonteEstadual = (uf: string, orgao: 'casa' | 'diario') => `${orgao === 'casa' ? 'casa' : 'doe'}-${uf.toLowerCase()}`

export async function registrarFontesEstaduais(payload: Payload, r: Resultado) {
  let criadas = 0
  let atualizadas = 0
  for (const o of r.orgaos) {
    const c = classificar(o)
    const slug = slugFonteEstadual(o.uf, o.orgao)
    const levantamento = { motivo: c.motivo + (c.ajustado ? ' (revisado)' : ''), verificadoEm: r.geradoEm }
    const existente = (await payload.find({ collection: 'fontes', where: { slug: { equals: slug } }, limit: 1, depth: 0 })).docs[0]
    const temConector = !!CONECTORES_SAPL[slug]
    if (existente) {
      // Liga só quando o conector chega (a fonte ainda não tinha conector); depois disso, quem decide é o autor
      const ligar = temConector && !existente.conector && !existente.ativa
      await payload.update({
        collection: 'fontes',
        id: existente.id,
        data: { nivel: c.nivel, url: c.url, levantamento, ...(temConector ? { conector: slug, manual: false } : {}), ...(ligar ? { ativa: true } : {}) },
      })
      atualizadas++
    } else {
      await payload.create({
        collection: 'fontes',
        data: {
          slug,
          nome: `${o.sigla} · ${o.nome}`,
          nivel: c.nivel,
          esfera: 'estadual',
          uf: o.uf,
          url: c.url,
          manual: c.nivel === 'D' && !temConector,
          ativa: temConector,
          conector: temConector ? slug : undefined,
          frequencia: o.orgao === 'diario' ? 'Dias úteis (a confirmar)' : 'Conforme as sessões (a confirmar)',
          levantamento,
        },
      })
      criadas++
    }
  }
  return { criadas, atualizadas }
}
