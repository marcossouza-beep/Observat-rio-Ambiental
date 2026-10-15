/**
 * Registra no painel (coleção Fontes) as 54 fontes estaduais do levantamento: 27 casas legislativas e 27 Diários Oficiais,
 * com o nível A–D e o motivo. Ficam desligadas (ativa = false) até cada conector existir; nível D fica marcado como manual.
 * Em fontes já cadastradas, atualiza só o nível, o endereço e o registro do levantamento (não mexe em ativa, manual nem conector).
 *
 * Uso: pnpm levantamento:fontes   (lê levantamento/resultado.json)
 */
import type { Payload } from 'payload'
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
    if (existente) {
      await payload.update({ collection: 'fontes', id: existente.id, data: { nivel: c.nivel, url: c.url, levantamento } })
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
          manual: c.nivel === 'D',
          ativa: false,
          frequencia: o.orgao === 'diario' ? 'Dias úteis (a confirmar)' : 'Conforme as sessões (a confirmar)',
          levantamento,
        },
      })
      criadas++
    }
  }
  return { criadas, atualizadas }
}
