import Link from 'next/link'
import { AMOSTRA_MINIMA, CARATERES, ROTULO_CARATER, ROTULO_TENDENCIA, type Distribuicao, type Tendencia } from '@/lib/indicadores'
import type { Padrao } from '@/lib/panorama'

/** Barra 100% do caráter, com o percentual escrito em cada parte que cabe (A19). */
export function BarraCarater({ d, fina = false }: { d: Distribuicao; fina?: boolean }) {
  const texto = CARATERES.filter((c) => d.percentuais[c]).map((c) => `${ROTULO_CARATER[c]} ${d.percentuais[c]}%`).join(', ')
  return (
    <div className={`barra-carater${fina ? '' : ' alta'}`} role="img" aria-label={d.total ? texto : 'Sem pareceres'}>
      {CARATERES.map((c) =>
        d.percentuais[c] ? (
          <i key={c} className={`c-${c}`} style={{ width: `${d.percentuais[c]}%` }}>
            {!fina && d.percentuais[c] >= 12 ? `${d.percentuais[c]}%` : null}
          </i>
        ) : null,
      )}
    </div>
  )
}

export function LegendaCarater() {
  return (
    <div className="legenda-sentido">
      {CARATERES.map((c) => (
        <span key={c}>
          <i className={`c-${c}`} /> {ROTULO_CARATER[c]}
        </span>
      ))}
    </div>
  )
}

export function SeloTendencia({ t }: { t: Tendencia }) {
  return <span className={`tag tend-${t.tipo}`}>{ROTULO_TENDENCIA[t.tipo]}</span>
}

/** Texto curto da tendência, com o saldo ou o aviso de amostra pequena. */
export function textoTendencia(t: Tendencia) {
  if (t.tipo === 'amostra_pequena') return t.total ? `só ${t.total} ${t.total === 1 ? 'parecer' : 'pareceres'}; a tendência aparece a partir de ${AMOSTRA_MINIMA}` : 'nenhum parecer ainda'
  return `saldo de ${t.saldo > 0 ? '+' : ''}${t.saldo} pontos`
}

/**
 * Padrão de atuação (A19): duas linhas (tudo que tramitou / só o que foi aprovado), tendência,
 * áreas mais frequentes e nota de método.
 */
export function PadraoAtuacao({ titulo, padrao, nomesAreas }: { titulo: string; padrao: Padrao; nomesAreas: Map<number, { nome: string; slug?: string | null }> }) {
  if (!padrao.total) return null
  const areas = padrao.areas.slice(0, 3).filter((a) => nomesAreas.has(a.id))
  return (
    <section className="padrao" aria-label={titulo}>
      <div className="padrao-h">
        <h2>{titulo}</h2>
        <SeloTendencia t={padrao.tendencia} />
      </div>
      <div className="padrao-linhas">
        <div>
          <span>
            Tudo que tramitou <small>{padrao.total} {padrao.total === 1 ? 'parecer' : 'pareceres'}</small>
          </span>
          <BarraCarater d={padrao.tudo} />
        </div>
        <div>
          <span>
            Só o que foi aprovado <small>{padrao.aprovadas.total ? `${padrao.aprovadas.total} ${padrao.aprovadas.total === 1 ? 'parecer' : 'pareceres'}` : 'nenhuma aprovada ainda'}</small>
          </span>
          {padrao.aprovadas.total ? <BarraCarater d={padrao.aprovadas} /> : <div className="barra-carater alta vazia" />}
        </div>
      </div>
      <LegendaCarater />
      <p className="nota-fonte">
        {ROTULO_TENDENCIA[padrao.tendencia.tipo]}: {textoTendencia(padrao.tendencia)}.
        {areas.length ? (
          <>
            {' '}
            Áreas mais frequentes:{' '}
            {areas.map((a, i) => {
              const t = nomesAreas.get(a.id)!
              return (
                <span key={a.id}>
                  {i ? ', ' : ''}
                  {t.slug ? <Link href={`/temas/${t.slug}`}>{t.nome}</Link> : t.nome} ({a.n})
                </span>
              )
            })}
            .
          </>
        ) : null}{' '}
        <Link href="/panorama#metodo">Como calculamos</Link>
      </p>
    </section>
  )
}
