import type { UIFieldServerProps } from 'payload'
import { alteracoesDoTexto, chaveNorma, porLei } from '../lib/alteracoes'
import { diferencas, recortar, resumoDiferencas } from '../lib/diferencas'
import { nomeDaLei } from '../lib/leis'
import { CASA } from '../lib/rotulos'
import type { Parlamentar } from '../payload-types'
import { dataCurta, linkDoc } from './util'

const idDe = (v: unknown) => (v && typeof v === 'object' ? (v as { id: number }).id : (v as number | undefined))

/**
 * Dossiê da proposta ao lado do parecer: texto, versões (com marcação mecânica do que mudou),
 * autoria, votações e tramitação. Nada daqui é escrito no parecer sozinho.
 */
export async function Dossie({ data, payload }: UIFieldServerProps) {
  const propId = idDe(data?.proposicao)
  if (!propId) return <p className="obs-nota">Escolha a proposição para ver o dossiê.</p>
  const [prop, versoes, tram, votos, emendas] = await Promise.all([
    payload.findByID({ collection: 'proposicoes', id: propId, depth: 1 }),
    payload.find({ collection: 'versoes', where: { proposicao: { equals: propId } }, sort: '-data', limit: 20, depth: 0 }),
    payload.find({ collection: 'tramitacoes', where: { proposicao: { equals: propId } }, sort: '-data', limit: 12, depth: 0 }),
    payload.find({ collection: 'votacoes', where: { proposicao: { equals: propId } }, sort: '-data', limit: 10, depth: 0 }),
    payload.count({ collection: 'emendas', where: { proposicao: { equals: propId } } }),
  ])
  const analisadaId = idDe(data?.versaoTexto)
  const nova = versoes.docs[0]
  const analisada = versoes.docs.find((v) => v.id === analisadaId)
  // Lei existente alterada pelo texto analisado: a página mostra "como é hoje × como fica" se houver o texto vigente
  const baseAlteracoes = analisada?.texto ? analisada : versoes.docs.find((v) => v.texto)
  const grupos = porLei(alteracoesDoTexto(baseAlteracoes?.texto))
  const chaves = grupos.flatMap((g) => [chaveNorma(g.lei), ...(prop.esfera === 'estadual' && prop.uf ? [chaveNorma(g.lei, prop.uf)] : [])])
  const fichas = chaves.length ? (await payload.find({ collection: 'normas-vigentes', where: { chave: { in: chaves } }, limit: chaves.length, depth: 0 })).docs : []
  const comparar = nova && analisada && nova.id !== analisada.id && nova.texto && analisada.texto ? recortar(diferencas(analisada.texto, nova.texto)) : null

  return (
    <div className="obs-dossie">
      <div className="obs-meta-linha">
        <a href={linkDoc('proposicoes', prop.id)}>
          <b>{prop.rotulo}</b>
        </a>
        <span>{prop.casa ? CASA[prop.casa] : ''}</span>
        <span>{prop.statusOficial || ''}</span>
        {prop.urlInteiroTeor || prop.urlFonte ? (
          <a href={prop.urlInteiroTeor || prop.urlFonte || '#'} target="_blank" rel="noopener">
            Fonte oficial ↗
          </a>
        ) : null}
      </div>
      {prop.ementa ? (
        <>
          <h3>Ementa</h3>
          <p>{prop.ementa}</p>
        </>
      ) : null}
      {prop.art1 ? (
        <>
          <h3>Art. 1º</h3>
          <p>{prop.art1}</p>
        </>
      ) : null}

      {prop.leisAfetadas?.length ? (
        <>
          <h3>Leis citadas na ementa</h3>
          <ul>
            {prop.leisAfetadas.map((l) => (
              <li key={l.id || l.rotulo}>
                <a href={l.url || '#'} target="_blank" rel="noopener">
                  {l.rotulo} ↗
                </a>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {grupos.length ? (
        <>
          <h3>Lei alterada: como é hoje × como fica</h3>
          <p className="obs-nota">Montado sozinho no topo do resumo prévio, a partir do texto da proposta e do texto compilado da lei.</p>
          <ul>
            {grupos.map((g) => {
              const ficha = fichas.find((f) => f.chave === chaveNorma(g.lei, prop.esfera === 'estadual' ? prop.uf : null)) || fichas.find((f) => f.chave === chaveNorma(g.lei))
              return (
                <li key={g.lei.rotulo}>
                  <b>{nomeDaLei({ rotulo: g.lei.rotulo, nomePopular: ficha?.nomePopular || g.lei.nomePopular })}</b> · {g.itens.map((a) => a.dispositivo).join(', ')}
                  <br />
                  {ficha?.texto ? (
                    <span className="obs-nota">
                      Texto vigente carregado{ficha.atualizadoEm ? ` (conferido em ${dataCurta(ficha.atualizadoEm)})` : ''} · <a href={linkDoc('normas-vigentes', ficha.id)}>abrir</a>
                    </span>
                  ) : (
                    <span className="obs-nota">
                      Falta o texto vigente.{' '}
                      <a href={ficha ? linkDoc('normas-vigentes', ficha.id) : linkDoc('normas-vigentes', 'create')}>Colar o texto compilado</a> (chave{' '}
                      <code>{chaveNorma(g.lei, prop.esfera === 'estadual' ? prop.uf : null)}</code>). Vale para todas as propostas que alteram esta lei.
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        </>
      ) : null}

      <h3>Versões do texto</h3>
      {versoes.docs.length ? (
        <ul>
          {versoes.docs.map((v) => (
            <li key={v.id}>
              {dataCurta(v.data)} · {v.rotulo || v.tipo} {v.id === analisadaId ? <b>(analisada no resumo prévio)</b> : null}
              {v.url ? (
                <>
                  {' '}
                  ·{' '}
                  <a href={v.url} target="_blank" rel="noopener">
                    arquivo
                  </a>
                </>
              ) : null}
              {v.texto ? (
                <details>
                  <summary>texto integral ({Math.round(v.texto.length / 1000)} mil caracteres)</summary>
                  <div className="obs-texto">{v.texto.slice(0, 20000)}</div>
                  {v.texto.length > 20000 ? <p className="obs-nota">Mostrando o começo. O texto completo está no arquivo oficial.</p> : null}
                </details>
              ) : v.semTextoMotivo ? (
                <span className="obs-nota"> · {v.semTextoMotivo}</span>
              ) : v.url ? (
                <span className="obs-nota"> · texto ainda não lido (a coleta lê algumas versões por rodada)</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="obs-nota">Nenhuma versão registrada.</p>
      )}
      {comparar ? (
        <>
          <h3>
            O que mudou: {analisada!.rotulo || 'analisada'} → {nova!.rotulo || 'nova'}{' '}
            <small>
              {resumoDiferencas(comparar).incluidas} palavras incluídas, {resumoDiferencas(comparar).retiradas} retiradas
            </small>
          </h3>
          <p className="obs-nota">Marcação mecânica, como o controle de alterações de um editor de texto. A leitura e a avaliação são suas.</p>
          <div className="obs-diff">
            {comparar.map((t, i) => (t.tipo === 'incluido' ? <ins key={i}>{t.texto}</ins> : t.tipo === 'retirado' ? <del key={i}>{t.texto}</del> : <span key={i}>{t.texto}</span>))}
          </div>
        </>
      ) : null}

      <h3>Quem</h3>
      <ul>
        {(prop.autoria || []).map((a, i) => {
          const p = a.parlamentar && typeof a.parlamentar === 'object' ? (a.parlamentar as Parlamentar) : null
          return (
            <li key={i}>
              {a.papel === 'relator' ? 'Relatoria' : 'Autoria'}: {p ? `${p.nome} (${p.partido}-${p.uf})` : a.nomeLivre}
              {a.orgao ? ` · ${a.orgao}` : ''}
            </li>
          )
        })}
        <li>Emendas: {emendas.totalDocs}</li>
        {votos.docs.map((v) => (
          <li key={v.id}>
            Votação {dataCurta(v.data)} · {v.orgao}: {v.placarSim != null ? `${v.placarSim} × ${v.placarNao}` : v.resultado || 'simbólica'}
          </li>
        ))}
      </ul>

      <h3>Tramitação recente</h3>
      <ul>
        {tram.docs.map((t) => (
          <li key={t.id}>
            {dataCurta(t.data)} · {t.orgao ? `${t.orgao}: ` : ''}
            {t.descricao}
          </li>
        ))}
      </ul>
      <p className="obs-nota">Dados das fontes oficiais. Nada daqui é escrito no resumo prévio sozinho.</p>
    </div>
  )
}
