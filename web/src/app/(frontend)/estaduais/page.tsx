import type { Metadata } from 'next'
import Link from 'next/link'
import { Bandeira, Carater, Impacto, Situacao } from '@/componentes/Etiquetas'
import { Seta } from '@/componentes/Icones'
import { PadraoAtuacao } from '@/componentes/Padrao'
import { dadosDoPanorama, dadosEstaduais, pareceresDe, type Cobertura } from '@/dados/consultas'
import { agrupar, chavesDeJurisdicao, padrao } from '@/lib/panorama'
import { deUF, REGIAO, UF_NOME } from '@/lib/rotulos'

type Busca = Promise<{ uf?: string; regiao?: string }>

/** Posição de cada estado no mapa em grade (linha, coluna), como no protótipo. */
const UFMAP: [string, number, number][] = [
  ['RR', 0, 1], ['AP', 0, 3], ['AC', 1, 0], ['AM', 1, 1], ['PA', 1, 2], ['MA', 1, 3], ['CE', 1, 4], ['RN', 1, 5], ['RO', 2, 1], ['MT', 2, 2], ['TO', 2, 3], ['PI', 2, 4], ['PB', 2, 5],
  ['MS', 3, 2], ['GO', 3, 3], ['BA', 3, 4], ['PE', 3, 5], ['SP', 4, 2], ['DF', 4, 3], ['MG', 4, 4], ['AL', 4, 5], ['PR', 5, 2], ['RJ', 5, 3], ['ES', 5, 4], ['SE', 5, 5], ['SC', 6, 2], ['RS', 7, 2],
]
const REGIOES = ['Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul']
const COB_TXT: Record<Cobertura, [string, string, string]> = {
  auto: ['Monitoramento automático', 'Coletamos diariamente os projetos da Assembleia.', 'tg-ben'],
  manual: ['Monitoramento manual', 'Acompanhamos os projetos ambientais pelo diário da Assembleia.', 'tg-alto'],
  breve: ['Em breve', 'Este estado entra no monitoramento nas próximas fases.', 'tg-place'],
}
const MAX_LISTA = 8

export const metadata: Metadata = {
  title: 'Leis estaduais',
  description: 'As leis ambientais que tramitam nas Assembleias Legislativas, estado por estado.',
  alternates: { canonical: '/estaduais' },
}

export default async function Estaduais({ searchParams }: { searchParams: Busca }) {
  const s = await searchParams
  const [{ porUF, cobertura }, panorama] = await Promise.all([dadosEstaduais(), dadosDoPanorama()])
  const qtd = (uf: string) => porUF.get(uf)?.length || 0
  const maisLeis = (ufs: string[]) => [...ufs].sort((a, b) => qtd(b) - qtd(a) || Number(cobertura(b) === 'auto') - Number(cobertura(a) === 'auto'))[0]
  const pedida = s.uf?.toUpperCase()
  const regiao = s.regiao && REGIOES.includes(s.regiao) ? s.regiao : undefined
  const uf =
    pedida && UF_NOME[pedida]
      ? pedida
      : regiao
        ? maisLeis(Object.keys(REGIAO).filter((u) => REGIAO[u] === regiao))
        : maisLeis(Object.keys(UF_NOME))

  const leis = porUF.get(uf) || []
  const lista = leis.slice(0, MAX_LISTA)
  const pareceres = await pareceresDe(lista.map((l) => l.id))
  const cob = cobertura(uf)
  const [cobTitulo, cobTexto, cobClasse] = COB_TXT[cob]
  const padraoUF = padrao(agrupar(panorama.itens, chavesDeJurisdicao).get(`uf:${uf}`) || [])

  return (
    <div className="wrap" style={{ maxWidth: 1040 }}>
      <header className="pg-head">
        <h1>Leis estaduais</h1>
        <p>As leis ambientais que tramitam nas Assembleias Legislativas. Escolha um estado no mapa.</p>
      </header>
      <div className="chips" style={{ justifyContent: 'flex-start', marginBottom: 18 }}>
        {REGIOES.map((r) => (
          <Link key={r} className="chip" href={`/estaduais?regiao=${encodeURIComponent(r)}`} aria-current={REGIAO[uf] === r ? 'true' : undefined}>
            {r}
          </Link>
        ))}
      </div>
      <div className="uf-layout">
        <div>
          <div className="tilemap" role="group" aria-label="Estados">
            {UFMAP.map(([u, linha, coluna]) => {
              const n = qtd(u)
              const breve = cobertura(u) === 'breve'
              return (
                <Link
                  key={u}
                  href={`/estaduais?uf=${u}`}
                  className={`uf ${breve ? 'breve' : n >= 2 ? 'n2' : n === 1 ? 'n1' : 'n0'}`}
                  style={{ gridRow: linha + 1, gridColumn: coluna + 1 }}
                  aria-current={u === uf ? 'true' : undefined}
                  aria-label={`${UF_NOME[u]}: ${n} ${n === 1 ? 'lei' : 'leis'}${breve ? ' (em breve)' : ''}`}
                  title={UF_NOME[u]}
                >
                  {u}
                  {n ? <small>{n}</small> : null}
                </Link>
              )
            })}
          </div>
          <div className="maplegend">
            <span>
              <i style={{ background: 'var(--green-dk)' }} />2 ou mais leis
            </span>
            <span>
              <i style={{ background: '#7FCB9D' }} />1 lei
            </span>
            <span>
              <i style={{ background: 'var(--green-50)' }} />
              monitorado, sem destaque
            </span>
            <span>
              <i style={{ background: 'repeating-linear-gradient(135deg,#fff 0 3px,#E6ECE8 3px 5px)', boxShadow: 'inset 0 0 0 1px #E6ECE8' }} />
              em breve
            </span>
          </div>
        </div>
        <div className="ufpanel">
          <span className="sub-h">{REGIAO[uf]}</span>
          <div className="uf-title">
            <Bandeira uf={uf} className="flag lg" />
            <h2>{UF_NOME[uf]}</h2>
          </div>
          <p className="casa">Assembleia Legislativa · Diário Oficial do Estado</p>
          <div className="ufstats">
            <div>
              <b>{leis.filter((l) => l.statusSimplificado === 'em_tramitacao').length}</b>
              <span>em tramitação</span>
            </div>
            <div>
              <b>{leis.filter((l) => l.statusSimplificado === 'aprovada' || l.statusSimplificado === 'norma').length}</b>
              <span>aprovadas</span>
            </div>
            <div>
              <b>{padraoUF.total}</b>
              <span>com resumo prévio</span>
            </div>
          </div>
          <div className="cov">
            <span className={`tag ${cobClasse}`}>{cobTitulo}</span>
            <span>{cobTexto}</span>
          </div>
          {padraoUF.total ? <PadraoAtuacao titulo={`Padrão de atuação · ${UF_NOME[uf]}`} padrao={padraoUF} nomesAreas={new Map(panorama.temas.map((t) => [t.id, t]))} /> : null}
          <div className="minilist">
            {lista.length ? (
              lista.map((l) => {
                const p = pareceres.get(l.id)
                return (
                  <Link key={l.id} className="minilaw" href={`/leis/${l.slug}`}>
                    <b>{l.titulo || l.ementa || l.rotulo}</b>
                    <div className="row">
                      <Situacao valor={l.statusSimplificado} />
                      {p ? <Impacto valor={p.impacto} /> : null}
                      {p ? <Carater valor={p.carater} /> : null}
                      <span className="n">{l.rotulo}</span>
                    </div>
                  </Link>
                )
              })
            ) : (
              <p style={{ color: 'var(--gray)', fontSize: '.92rem' }}>{cob === 'breve' ? 'Ainda não monitoramos este estado.' : 'Nenhuma lei ambiental em destaque no momento.'}</p>
            )}
          </div>
          {leis.length > MAX_LISTA ? (
            <Link className="arrow" href={`/leis?esfera=estadual&uf=${uf}`} style={{ fontSize: '.9rem' }}>
              Todas as {leis.length} leis {deUF(uf)} <Seta />
            </Link>
          ) : null}
          {cob !== 'breve' ? (
            <Link className="arrow" href={`/parlamentares?casa=assembleia&uf=${uf}`} style={{ fontSize: '.9rem' }}>
              Deputados {deUF(uf)} <Seta />
            </Link>
          ) : null}
          <div className="ask">
            <span>{cob === 'breve' ? `Quer que priorizemos ${UF_NOME[uf]}?` : `Receba as novidades ${deUF(uf)} por e-mail.`}</span>
            <Link className="pill-btn" href="/inscricao">
              {cob === 'breve' ? 'Avise-me' : 'Acompanhar estado'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
