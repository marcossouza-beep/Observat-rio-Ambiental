/**
 * Texto vigente das leis federais alteradas pelas propostas do site, pelo normas.leg.br.
 * Algumas leis por rodada; cada lei é conferida de novo a cada 7 dias. Texto colado pela equipe não é trocado.
 */
import type { Payload } from 'payload'
import { alteracoesDoTexto, chaveNorma, leisAlteradas } from '../../lib/alteracoes'
import { leisCitadas } from '../../lib/leis'
import type { Baixador } from '../textos'
import { lerFicha, textoDoHtml, urlFicha } from './mapear'

const SEMANA = 7 * 864e5

export async function preencherNormas(payload: Payload, opcoes: { baixar: Baixador; limite?: number; agora?: Date }) {
  const agora = opcoes.agora || new Date()
  const r = { conferidas: 0, novas: 0, falhas: 0 }
  // Propostas federais que aparecem no site (lei estadual não altera lei federal)
  const props = await payload.find({
    collection: 'proposicoes',
    where: { esfera: { equals: 'federal' }, situacaoEditorial: { in: ['ativa', 'monitorada'] } },
    sort: '-ultimaMovimentacao',
    limit: 200,
    depth: 0,
    select: { ementa: true },
  })
  const leis = new Map<string, ReturnType<typeof leisCitadas>[number]>()
  for (const p of props.docs) {
    const v = await payload.find({ collection: 'versoes', where: { proposicao: { equals: p.id }, texto: { exists: true } }, sort: '-data', limit: 1, depth: 0 })
    for (const l of leisAlteradas(alteracoesDoTexto(v.docs[0]?.texto), leisCitadas(p.ementa))) if (l.urn) leis.set(chaveNorma(l), l)
  }
  let feitas = 0
  for (const [chave, lei] of leis) {
    if (feitas >= (opcoes.limite ?? 5)) break
    const atual = (await payload.find({ collection: 'normas-vigentes', where: { chave: { equals: chave } }, limit: 1, depth: 0 })).docs[0]
    if (atual && (atual.origem === 'manual' || (atual.atualizadoEm && agora.getTime() - new Date(atual.atualizadoEm).getTime() < SEMANA))) continue
    feitas++
    try {
      const ficha = lerFicha(JSON.parse((await opcoes.baixar(urlFicha(lei.urn!))).toString('utf8')))
      if (!ficha.urlVigente) throw new Error('sem compilação vigente no normas.leg.br')
      const texto = textoDoHtml((await opcoes.baixar(ficha.urlVigente)).toString('utf8'))
      if (!/^Art\.?\s*1/m.test(texto)) throw new Error('texto vigente sem artigos')
      const data = {
        chave,
        rotulo: lei.rotulo,
        // O nome pelo qual a lei é procurada: o da nossa lista, se houver; senão, o do normas.leg.br
        nomePopular: atual?.nomePopular || lei.nomePopular || ficha.nomePopular || undefined,
        url: ficha.pagina || lei.url,
        texto,
        origem: 'coleta' as const,
        atualizadoEm: agora.toISOString(),
      }
      if (atual) await payload.update({ collection: 'normas-vigentes', id: atual.id, data })
      else await payload.create({ collection: 'normas-vigentes', data })
      if (atual) r.conferidas++
      else r.novas++
    } catch (e) {
      payload.logger.warn(`Texto vigente de ${lei.rotulo} não obtido: ${e instanceof Error ? e.message : e}`)
      r.falhas++
    }
  }
  return r
}
