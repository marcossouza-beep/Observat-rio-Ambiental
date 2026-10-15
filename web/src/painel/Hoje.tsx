import type { ServerProps } from 'payload'
import { ROTULO_COMPROMISSO, type TipoCompromisso } from '../lib/compromissos'
import { situacaoFonte } from '../lib/fontes'
import type { Proposicao } from '../payload-types'
import { ADMIN, Chip, ChipPrazo, dataCurta, inicioDaSemana, linkDoc } from './util'

/** "Hoje": o que precisa do autor, do mais urgente ao menos (docs/TELAS.md, B1). Fica no topo do painel. */
export async function Hoje({ payload, user }: ServerProps) {
  if (!user) return null
  const agora = new Date()
  const [compromissos, fontes, pauta, publicadosSemana, agendados, revisao, ajustes] = await Promise.all([
    payload.find({ collection: 'compromissos', where: { status: { in: ['aberto', 'suspenso'] } }, sort: 'prazoEm', limit: 60, depth: 0 }),
    payload.find({ collection: 'fontes', where: { ativa: { equals: true } }, limit: 100, depth: 0 }),
    payload.find({
      collection: 'tramitacoes',
      where: { tipoEvento: { equals: 'pauta' }, data: { greater_than_equal: agora.toISOString(), less_than_equal: new Date(agora.getTime() + 7 * 864e5).toISOString() } },
      sort: 'data',
      limit: 20,
      depth: 1,
    }),
    payload.count({ collection: 'pareceres', where: { publicadoEm: { greater_than_equal: inicioDaSemana(agora) } } }),
    payload.count({ collection: 'pareceres', where: { status: { equals: 'agendado' } } }),
    payload.count({ collection: 'pareceres', where: { status: { equals: 'em_revisao' } } }),
    payload.findGlobal({ slug: 'ajustes', depth: 0 }),
  ])
  const propIds = pauta.docs.map((t) => (typeof t.proposicao === 'object' ? t.proposicao.id : t.proposicao))
  const pareceres = propIds.length
    ? await payload.find({ collection: 'pareceres', where: { proposicao: { in: propIds } }, limit: 50, depth: 0 })
    : { docs: [] }
  const parecerDe = new Map(pareceres.docs.map((p) => [typeof p.proposicao === 'object' ? p.proposicao.id : p.proposicao, p]))

  const fontesProblema = fontes.docs
    .map((f) => ({
      f,
      s: situacaoFonte({ manual: f.manual ?? false, ultimaColetaOk: f.ultimaColetaOk ? new Date(f.ultimaColetaOk) : null, itensUltimaColeta: f.itensUltimaColeta, mediaItens30d: f.mediaItens30d }, agora),
    }))
    .filter((x) => x.s === 'atrasada' || x.s === 'volume_baixo')
  const prometidos = compromissos.docs.filter((c) => c.tipo === 'parecer_prometido').length
  const atualizacoes = compromissos.docs.filter((c) => c.tipo === 'atualizacao').length
  const atrasados = compromissos.docs.filter((c) => c.status === 'aberto' && new Date(c.prazoEm) < agora).length
  const meta = ajustes.metaSemanal || 6

  return (
    <div className="obs-hoje">
      <div className="obs-faixa">
        <span className={`obs-ponto ${atrasados || fontesProblema.length ? 'r' : ''}`} />
        <b>{atrasados ? `${atrasados} ${atrasados === 1 ? 'compromisso atrasado' : 'compromissos atrasados'}` : 'Nenhum compromisso atrasado'}</b>
        <span>·</span>
        <span>
          {prometidos} {prometidos === 1 ? 'parecer prometido' : 'pareceres prometidos'} em aberto
        </span>
        <span>·</span>
        <a href={`${ADMIN}/triagem`}>Triagem</a>
        <a href={`${ADMIN}/fila`}>Fila de pareceres</a>
      </div>
      <div className="obs-grid">
        <section className="obs-card">
          <h2>Precisa de você</h2>
          <div className="obs-linhas">
            {fontesProblema.map(({ f, s }) => (
              <a key={`f${f.id}`} href={linkDoc('fontes', f.id)}>
                <Chip cor="r">Fonte</Chip>
                <span>
                  <b>{f.nome}</b> {s === 'atrasada' ? 'sem coleta além do limite; o site mostra a nota de fonte fora do ar' : 'com volume de itens muito abaixo do normal'}
                </span>
              </a>
            ))}
            {compromissos.docs.map((c) => (
              <a key={c.id} href={linkDoc(c.alvo, c.alvoId)}>
                <ChipPrazo prazo={c.prazoEm} agora={agora} />
                <span>
                  <b>{ROTULO_COMPROMISSO[c.tipo as TipoCompromisso]}</b> · {c.descricao.replace(/^[^:]+:\s*/, '')}
                  {c.status === 'suspenso' ? ' (aguardando resposta)' : ''}
                </span>
              </a>
            ))}
            {!compromissos.docs.length && !fontesProblema.length ? <p className="obs-vazio">Nada pendente.</p> : null}
          </div>
        </section>
        <div>
          <section className="obs-card">
            <h2>Meta da semana</h2>
            <div className="obs-meta">
              <b>
                {publicadosSemana.totalDocs} de {meta}
              </b>
              <span>publicados desde segunda</span>
            </div>
            <div className="obs-barra">
              <i style={{ width: `${Math.min(100, (publicadosSemana.totalDocs / meta) * 100)}%` }} />
            </div>
            <p className="obs-nota">
              {agendados.totalDocs} agendados · {revisao.totalDocs} em revisão
            </p>
          </section>
          <section className="obs-card">
            <h2>Promessas no ar</h2>
            <p className="obs-nota">
              “Parecer em preparação” em <b>{prometidos}</b> {prometidos === 1 ? 'página' : 'páginas'} · “Atualização em preparação” em <b>{atualizacoes}</b>
            </p>
          </section>
        </div>
      </div>
      {pauta.docs.length ? (
        <section className="obs-card">
          <h2>Votações dos próximos 7 dias</h2>
          <div className="obs-linhas">
            {pauta.docs.map((t) => {
              const p = t.proposicao as Proposicao
              const par = parecerDe.get(p.id)
              return (
                <a key={t.id} href={linkDoc('proposicoes', p.id)}>
                  <Chip cor="y">{dataCurta(t.data)}</Chip>
                  <span>
                    <b>{p.titulo || p.rotulo}</b> · {t.orgao}{' '}
                    {par?.status === 'publicado' ? (
                      par.desatualizadoDesde ? <Chip cor="r">Parecer desatualizado</Chip> : <Chip cor="g">Parecer publicado</Chip>
                    ) : p.situacaoEditorial === 'ativa' ? (
                      <Chip cor="y">Parecer em preparação</Chip>
                    ) : (
                      <Chip>Sem parecer previsto</Chip>
                    )}
                  </span>
                </a>
              )
            })}
          </div>
        </section>
      ) : null}
    </div>
  )
}
