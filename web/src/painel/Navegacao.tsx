import type { ServerProps } from 'payload'
import { ADMIN } from './util'

/** Atalhos de trabalho no topo do menu lateral, com contadores. */
export async function Navegacao({ payload, user }: ServerProps) {
  if (!user) return null
  const [triagem, atualizar, radar] = await Promise.all([
    payload.count({ collection: 'proposicoes', where: { situacaoEditorial: { equals: 'triagem' } } }),
    payload.count({ collection: 'compromissos', where: { tipo: { equals: 'atualizacao' }, status: { equals: 'aberto' } } }),
    payload.count({ collection: 'alertas', where: { visto: { equals: false } } }),
  ])
  return (
    <nav className="obs-nav" aria-label="Trabalho do dia">
      <a href={ADMIN}>Hoje</a>
      <a href={`${ADMIN}/radar`}>
        Radar {radar.totalDocs ? <span className="obs-badge">{radar.totalDocs}</span> : null}
      </a>
      <a href={`${ADMIN}/triagem`}>
        Triagem {triagem.totalDocs ? <span className="obs-badge">{triagem.totalDocs}</span> : null}
      </a>
      <a href={`${ADMIN}/fila`}>
        Fila de resumos prévios {atualizar.totalDocs ? <span className="obs-badge r">{atualizar.totalDocs}</span> : null}
      </a>
    </nav>
  )
}
