import type { AdminViewServerProps, Where } from 'payload'
import type { Parecer, Proposicao } from '../payload-types'
import { CriarParecer } from './CriarParecer'
import { Moldura } from './Moldura'
import { ADMIN, Chip, ChipPrazo, dataCurta, linkDoc } from './util'

const ABAS = [
  ['atualizar', 'A atualizar'],
  ['prometidos', 'Prometidos'],
  ['revisao', 'Em revisão'],
  ['agendados', 'Agendados'],
  ['publicados', 'Publicados'],
] as const

const AJUDA: Record<string, string> = {
  atualizar: 'O texto da proposta mudou depois do parecer. A página pública mostra a faixa “atualização em preparação” até sair a nova versão.',
  prometidos: 'Pareceres prometidos ao público. O aviso “nos próximos dias” está no ar; cumpra o prazo ou passe a proposta para Acompanhar.',
  revisao: 'Prontos para a última leitura antes de agendar ou publicar.',
  agendados: 'Saem sozinhos na hora marcada (verificação a cada 15 minutos), se as travas de publicação estiverem resolvidas.',
  publicados: 'No ar. Se o texto da proposta mudar, o parecer vai sozinho para “A atualizar”.',
}

/** Fila de pareceres, do prometido ao publicado (docs/TELAS.md, B3). */
export async function Fila(props: AdminViewServerProps) {
  const payload = props.initPageResult.req.payload
  const aba = (typeof props.searchParams?.aba === 'string' ? props.searchParams.aba : 'prometidos') as (typeof ABAS)[number][0]
  const agora = new Date()

  const contar = (where: Where) => payload.count({ collection: 'pareceres', where }).then((r) => r.totalDocs)
  const [nAtualizar, nRevisao, nAgendados, nPublicados, prometidas] = await Promise.all([
    contar({ status: { equals: 'publicado' }, desatualizadoDesde: { exists: true } }),
    contar({ status: { equals: 'em_revisao' } }),
    contar({ status: { equals: 'agendado' } }),
    contar({ status: { equals: 'publicado' } }),
    payload.find({ collection: 'proposicoes', where: { situacaoEditorial: { equals: 'ativa' } }, sort: 'prazoParecer', limit: 200, depth: 0 }),
  ])
  const ids = prometidas.docs.map((p) => p.id)
  const pareceresDasPrometidas = ids.length ? await payload.find({ collection: 'pareceres', where: { proposicao: { in: ids } }, limit: 200, depth: 0 }) : { docs: [] as Parecer[] }
  const parecerDe = new Map(pareceresDasPrometidas.docs.map((p) => [typeof p.proposicao === 'object' ? p.proposicao.id : p.proposicao, p]))
  const semPublicar = prometidas.docs.filter((p) => parecerDe.get(p.id)?.status !== 'publicado')
  const contagem: Record<string, number> = { atualizar: nAtualizar, prometidos: semPublicar.length, revisao: nRevisao, agendados: nAgendados, publicados: nPublicados }

  let linhas: React.ReactNode
  if (aba === 'prometidos') {
    linhas = semPublicar.map((p) => {
      const par = parecerDe.get(p.id)
      return (
        <div key={p.id} className="obs-linha">
          <div>
            <a href={linkDoc('proposicoes', p.id)}>
              <b>{p.rotulo}</b>
            </a>{' '}
            · {p.titulo || p.ementa?.slice(0, 90)}
            <div className="obs-meta-linha">
              <ChipPrazo prazo={p.prazoParecer} agora={agora} />
              {par ? <Chip cor="b">{par.status === 'rascunho' ? 'Rascunho iniciado' : par.status === 'em_revisao' ? 'Em revisão' : par.status === 'agendado' ? 'Agendado' : par.status}</Chip> : <Chip>Ainda não começou</Chip>}
            </div>
          </div>
          {par ? (
            <a className="obs-btn p" href={linkDoc('pareceres', par.id)}>
              Abrir parecer
            </a>
          ) : (
            <CriarParecer proposicao={p.id} />
          )}
        </div>
      )
    })
  } else {
    const where: Where =
      aba === 'atualizar'
        ? { status: { equals: 'publicado' }, desatualizadoDesde: { exists: true } }
        : aba === 'revisao'
          ? { status: { equals: 'em_revisao' } }
          : aba === 'agendados'
            ? { status: { equals: 'agendado' } }
            : { status: { equals: 'publicado' } }
    const r = await payload.find({ collection: 'pareceres', where, sort: aba === 'agendados' ? 'agendadoPara' : '-publicadoEm', limit: 100, depth: 1 })
    const prazos =
      aba === 'atualizar'
        ? new Map(
            (
              await payload.find({ collection: 'compromissos', where: { tipo: { equals: 'atualizacao' }, status: { in: ['aberto', 'suspenso'] } }, limit: 200, depth: 0 })
            ).docs.map((c) => [String(c.alvoId), c.prazoEm]),
          )
        : new Map<string, string>()
    linhas = r.docs.map((par) => {
      const lei = par.proposicao as Proposicao
      return (
        <div key={par.id} className="obs-linha">
          <div>
            <a href={linkDoc('pareceres', par.id)}>
              <b>{lei?.rotulo}</b>
            </a>{' '}
            · {par.titulo || lei?.titulo}
            <div className="obs-meta-linha">
              {aba === 'atualizar' ? (
                <>
                  <Chip cor="r">Texto mudou em {dataCurta(par.desatualizadoDesde)}</Chip>
                  <ChipPrazo prazo={prazos.get(String(par.id))} agora={agora} />
                </>
              ) : aba === 'agendados' ? (
                <Chip cor="l">Sai em {par.agendadoPara ? new Date(par.agendadoPara).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '—'}</Chip>
              ) : aba === 'publicados' ? (
                <span>Publicado em {dataCurta(par.publicadoEm)} · versão {par.versao ?? 1}</span>
              ) : null}
            </div>
          </div>
          <a className="obs-btn" href={linkDoc('pareceres', par.id)}>
            {aba === 'atualizar' ? 'Atualizar' : 'Abrir'}
          </a>
        </div>
      )
    })
  }

  return (
    <Moldura props={props} titulo="Fila de pareceres" sub="Do prometido ao publicado, com prazo à vista.">
      <nav className="obs-abas" aria-label="Situação">
        {ABAS.map(([k, t]) => (
          <a key={k} href={`${ADMIN}/fila?aba=${k}`} aria-current={aba === k ? 'page' : undefined}>
            {t} <span className={`obs-badge ${k === 'atualizar' && contagem[k] ? 'r' : ''}`}>{contagem[k]}</span>
          </a>
        ))}
      </nav>
      <p className="obs-nota">{AJUDA[aba]}</p>
      <section className="obs-card">{Array.isArray(linhas) && linhas.length ? linhas : <p className="obs-vazio">Nada aqui.</p>}</section>
    </Moldura>
  )
}
