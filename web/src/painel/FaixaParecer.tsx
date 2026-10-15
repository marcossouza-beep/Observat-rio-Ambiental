import type { UIFieldServerProps } from 'payload'
import { ChipPrazo, dataCurta } from './util'

const idDe = (v: unknown) => (v && typeof v === 'object' ? (v as { id: number }).id : (v as number | undefined))

/** Faixa no topo do editor: prazo prometido, votação próxima e, se o texto mudou, o que o site está mostrando. */
export async function FaixaParecer({ data, payload, id }: UIFieldServerProps) {
  const propId = idDe(data?.proposicao)
  if (!propId) return null
  const agora = new Date()
  const [prop, pauta, atualizacao] = await Promise.all([
    payload.findByID({ collection: 'proposicoes', id: propId, depth: 0 }).catch(() => null),
    payload.find({ collection: 'tramitacoes', where: { proposicao: { equals: propId }, tipoEvento: { equals: 'pauta' }, data: { greater_than_equal: agora.toISOString() } }, sort: 'data', limit: 1, depth: 0 }),
    id ? payload.find({ collection: 'compromissos', where: { alvo: { equals: 'pareceres' }, alvoId: { equals: String(id) }, tipo: { equals: 'atualizacao' }, status: { in: ['aberto', 'suspenso'] } }, limit: 1, depth: 0 }) : null,
  ])
  if (!prop) return null
  const voto = pauta.docs[0]
  if (data?.desatualizadoDesde) {
    return (
      <div className="obs-aviso r">
        <b>O texto mudou em {dataCurta(data.desatualizadoDesde)}.</b> O parecer publicado analisa uma versão anterior. A página pública mostra “O texto mudou depois deste parecer; atualização em preparação”.
        Aponte a nova versão em “Versão do texto analisada”, escreva “O que mudou nesta versão” e publique. <ChipPrazo prazo={atualizacao?.docs[0]?.prazoEm} agora={agora} />
        {voto ? ` Vota em ${dataCurta(voto.data)} (${voto.orgao}).` : ''}
      </div>
    )
  }
  if (data?.status === 'publicado') return null
  return (
    <div className="obs-aviso y">
      {prop.situacaoEditorial === 'ativa' ? (
        <>
          Parecer prometido ao público <ChipPrazo prazo={prop.prazoParecer} agora={agora} />
        </>
      ) : (
        <>Esta proposta está como “{prop.situacaoEditorial}”: o site não promete parecer.</>
      )}
      {voto ? ` · vota em ${dataCurta(voto.data)} (${voto.orgao})` : ''}
    </div>
  )
}
