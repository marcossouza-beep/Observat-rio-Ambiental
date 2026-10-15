import type { AdminViewServerProps } from 'payload'
import type { Alerta, Proposicao } from '../payload-types'
import { TIPOS_ALERTA } from '../collections/Sistema'
import { MarcarVistos } from './MarcarVistos'
import { Moldura } from './Moldura'
import { ADMIN, Chip, dataCurta, linkDoc } from './util'

const ROTULO = Object.fromEntries(TIPOS_ALERTA.map((t) => [t.value, t.label]))
/** Cor do chip por peso do evento: pauta e votação pedem decisão rápida. */
const COR: Record<string, 'r' | 'y' | 'g' | 'b' | ''> = { pauta: 'r', votacao: 'r', urgencia: 'r', veto: 'r', substitutivo: 'y', nova_versao: 'y', aprovacao: 'g', sancao: 'g', situacao: 'b' }

/** Radar: o que mudou nas propostas acompanhadas (pauta, urgência, substitutivo, votação, sanção, veto). */
export async function Radar(props: AdminViewServerProps) {
  const payload = props.initPageResult.req.payload
  const todos = props.searchParams?.todos === '1'
  const agora = new Date()
  const r = await payload.find({
    collection: 'alertas',
    where: todos ? { data: { greater_than: new Date(agora.getTime() - 30 * 864e5).toISOString() } } : { visto: { equals: false } },
    sort: '-data',
    limit: 150,
    depth: 1,
  })
  const naoVistos = todos ? (await payload.count({ collection: 'alertas', where: { visto: { equals: false } } })).totalDocs : r.totalDocs
  return (
    <Moldura props={props} titulo="Radar" sub="O que mudou nas propostas que o site acompanha, coletado da Câmara e do Senado. A pauta da semana sai daqui.">
      <div className="obs-faixa">
        <b>{naoVistos ? `${naoVistos} ${naoVistos === 1 ? 'novidade' : 'novidades'} sem ver` : 'Nada novo'}</b>
        <span className="obs-filtros">
          <a href={`${ADMIN}/radar`} aria-current={!todos ? 'page' : undefined}>
            Sem ver
          </a>
          <a href={`${ADMIN}/radar?todos=1`} aria-current={todos ? 'page' : undefined}>
            Últimos 30 dias
          </a>
        </span>
        {naoVistos ? <MarcarVistos /> : null}
      </div>
      <section className="obs-card">
        <div className="obs-linhas">
          {r.docs.map((a: Alerta) => {
            const p = a.proposicao as Proposicao | null
            return (
              <a key={a.id} href={p ? linkDoc('proposicoes', p.id) : '#'} className={a.visto ? 'obs-visto' : ''}>
                <Chip cor={COR[a.tipo] || ''}>{ROTULO[a.tipo] || a.tipo}</Chip>
                <span>
                  <b>{p ? p.titulo || p.rotulo : 'Proposta removida'}</b> · {dataCurta(a.data)} · {a.titulo}
                  {p?.situacaoEditorial === 'triagem' ? ' ' : null}
                  {p?.situacaoEditorial === 'triagem' ? <Chip>Na triagem</Chip> : null}
                </span>
              </a>
            )
          })}
          {!r.docs.length ? <p className="obs-vazio">Nenhuma novidade. A coleta roda 4 vezes ao dia (6h, 12h, 18h e 23h).</p> : null}
        </div>
      </section>
    </Moldura>
  )
}
