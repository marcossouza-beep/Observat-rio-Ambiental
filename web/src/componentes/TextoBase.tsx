import { Seta } from '@/componentes/Icones'
import { EFEITOS_COTEJO, type PontoCotejo } from '@/lib/publicacao'
import { dataBR } from '@/lib/rotulos'
import { type Alteracao, artigoDaLei, chaveNorma, porLei } from '@/lib/alteracoes'
import { nomeDaLei } from '@/lib/leis'
import { organizarTexto, rotuloDoTrecho, type Trecho } from '@/lib/textoBase'
import type { NormaVigente, Proposicao, Versao } from '@/payload-types'

const TIPO_VERSAO: Record<string, string> = {
  original: 'Texto original',
  substitutivo: 'Substitutivo',
  parecer_relator: 'Parecer do relator',
  emenda_aglutinativa: 'Emenda aglutinativa',
  redacao_final: 'Redação final',
  autografo: 'Texto enviado à outra casa',
  norma: 'Lei / norma publicada',
}
const nomeDaVersao = (v: Versao) => v.rotulo || TIPO_VERSAO[v.tipo || 'original'] || 'Texto'

function Dispositivos({ trechos }: { trechos: Trecho[] }) {
  return (
    <div className="tb-disp">
      {trechos.map((t, i) => {
        const { rotulo, resto } = rotuloDoTrecho(t)
        return (
          <p key={i} className={`tb-${t.tipo}`}>
            {rotulo ? <b>{rotulo}</b> : null} {resto}
          </p>
        )
      })}
    </div>
  )
}

/**
 * I. Texto base da proposta: ementa e íntegra do texto analisado, como saíram do arquivo oficial, antes de
 * qualquer análise. Se o parecer analisa um substitutivo, o texto original fica logo abaixo, recolhido.
 */
export function TextoBase({
  lei,
  analisada,
  original,
  alteracoes = [],
  normas = [],
}: {
  lei: Proposicao
  analisada: Versao | null
  original: Versao | null
  alteracoes?: Alteracao[]
  normas?: NormaVigente[]
}) {
  const base = analisada || original
  const texto = organizarTexto(base?.texto)
  const outroOriginal = analisada && original && original.id !== analisada.id ? organizarTexto(original.texto) : null
  const oficial = base?.url || lei.urlInteiroTeor || lei.urlFonte
  return (
    <div className="tb">
      {lei.ementa ? (
        <div className="tb-ementa">
          <span className="sub-h">Ementa</span>
          <p>{lei.ementa}</p>
        </div>
      ) : null}
      <p className="tb-fonte">
        {base ? (
          <>
            {nomeDaVersao(base)}, de {dataBR(base.data)}. Reprodução do arquivo oficial, sem edição.
          </>
        ) : (
          'Texto apresentado.'
        )}{' '}
        {oficial ? (
          <a className="link-oficial" href={oficial} target="_blank" rel="noopener">
            Arquivo oficial <Seta />
          </a>
        ) : null}
      </p>
      {texto.dispositivos.length ? (
        <div className="tb-integra" tabIndex={0} role="region" aria-label={`Íntegra: ${base ? nomeDaVersao(base) : 'texto base'}`}>
          <Dispositivos trechos={texto.dispositivos} />
        </div>
      ) : (
        <p className="tb-vazio">A íntegra ainda não foi extraída do arquivo oficial{base?.semTextoMotivo ? ` (${base.semTextoMotivo})` : ''}. Consulte o texto pelo link acima.</p>
      )}
      {alteracoes.length ? <TextoAlterado alteracoes={alteracoes} normas={normas} uf={lei.esfera === 'estadual' ? lei.uf : null} versao={base} /> : null}
      {texto.justificacao.length ? (
        <details className="tb-mais">
          <summary>Justificação do autor</summary>
          <div className="tb-disp">
            {texto.justificacao.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </details>
      ) : null}
      {outroOriginal?.dispositivos.length && original ? (
        <details className="tb-mais">
          <summary>Texto original, de {dataBR(original.data)}</summary>
          <Dispositivos trechos={outroOriginal.dispositivos} />
        </details>
      ) : null}
    </div>
  )
}

const TIPO_ALTERACAO: Record<Alteracao['tipo'], string> = { nova_redacao: 'nova redação', acrescimo: 'acréscimo', revogacao: 'revogação' }

/** A ficha da lei alterada: primeiro a estadual de mesmo número (proposta estadual), depois a federal. */
export function normaDe(normas: NormaVigente[], l: Alteracao['lei'], uf?: string | null) {
  return (uf && normas.find((n) => n.chave === chaveNorma(l, uf))) || normas.find((n) => n.chave === chaveNorma(l)) || null
}

/**
 * Proposta que altera lei existente: para cada dispositivo, a redação vigente (recortada do texto compilado
 * da lei) ao lado da redação proposta, as duas literais. Nada aqui é escrito pelo autor.
 */
export function TextoAlterado({ alteracoes, normas, uf, versao }: { alteracoes: Alteracao[]; normas: NormaVigente[]; uf?: string | null; versao?: Versao | null }) {
  const proposta = versao ? `${nomeDaVersao(versao)}, de ${dataBR(versao.data)}` : 'texto da proposta'
  return (
    <div className="tb-alt">
      {porLei(alteracoes).map(({ lei, itens }) => {
        const norma = normaDe(normas, lei, uf)
        const nome = nomeDaLei({ rotulo: lei.rotulo, nomePopular: norma?.nomePopular || lei.nomePopular })
        return (
          <section key={lei.rotulo} className="tb-lei">
            <h3>Texto normativo alterado: {nome}</h3>
            <p className="tb-fonte">
              {norma?.texto ? (
                <>
                  Redação vigente: texto compilado da fonte oficial{norma.atualizadoEm ? `, conferido em ${dataBR(norma.atualizadoEm)}` : ''}. Redação proposta: {proposta}.
                </>
              ) : (
                `A redação vigente ainda não foi carregada; consulte o texto compilado na fonte oficial. Redação proposta: ${proposta}.`
              )}{' '}
              <a className="link-oficial" href={norma?.url || lei.url} target="_blank" rel="noopener">
                {lei.rotulo} na fonte oficial <Seta />
              </a>
            </p>
            {itens.map((a, i) => {
              const vigente = artigoDaLei(norma?.texto, a.artigo)
              return (
                <div key={i} className="tb-par">
                  <div className="tb-par-cab">
                    <b>{a.dispositivo}</b> · {TIPO_ALTERACAO[a.tipo]}
                  </div>
                  <div className="tb-par-cols">
                    <div>
                      <span className="sub-h">Como é hoje</span>
                      {vigente ? (
                        <Dispositivos trechos={organizarTexto(vigente).dispositivos} />
                      ) : (
                        <p className="tb-vazio">{a.tipo === 'acrescimo' ? 'Dispositivo novo: não há redação vigente.' : norma?.texto ? 'Dispositivo não localizado no texto compilado.' : 'Redação vigente ainda não carregada.'}</p>
                      )}
                    </div>
                    <div>
                      <span className="sub-h">Como fica</span>
                      {a.tipo === 'revogacao' ? <p className="tb-vazio">Revogado.</p> : <Dispositivos trechos={organizarTexto(a.proposto).dispositivos} />}
                    </div>
                  </div>
                </div>
              )
            })}
          </section>
        )
      })}
    </div>
  )
}

/** Quadro do cotejo: regime vigente × proposta, ponto a ponto, com o efeito na proteção ambiental. */
export function Cotejo({ pontos }: { pontos: PontoCotejo[] }) {
  const validos = pontos.filter((p) => (p.vigente || '').trim() && (p.proposto || '').trim())
  if (!validos.length) return null
  return (
    <div className="cotejo">
      <table>
        <caption className="sr">Regime vigente e proposta, ponto a ponto</caption>
        <thead>
          <tr>
            <th scope="col">Ponto</th>
            <th scope="col">Regime vigente</th>
            <th scope="col">Proposta</th>
            <th scope="col">Efeito</th>
          </tr>
        </thead>
        <tbody>
          {validos.map((p, i) => {
            const ef = EFEITOS_COTEJO.find((e) => e.value === p.efeito)
            return (
              <tr key={i}>
                <th scope="row" data-r="Ponto">
                  <span>
                    <span className="cj-n">{i + 1}</span>
                    {p.dispositivo ? <span className="cj-disp">{p.dispositivo}</span> : null}
                  </span>
                </th>
                <td data-r="Regime vigente">{p.vigente}</td>
                <td data-r="Proposta">{p.proposto}</td>
                <td data-r="Efeito" className={`cj-ef cj-${p.efeito || 'neutro'}`}>
                  <span>
                    {ef ? (
                      <>
                        <span aria-hidden="true">{ef.sinal}</span> {ef.label}
                      </>
                    ) : (
                      '—'
                    )}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="cj-leg">↑ amplia · ↓ reduz · = sem efeito direto na proteção ambiental. O cotejo integral, artigo por artigo, está no quadro comparativo (PDF).</p>
    </div>
  )
}
