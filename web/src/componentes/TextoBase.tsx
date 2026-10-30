import { Seta } from '@/componentes/Icones'
import { EFEITOS_COTEJO, type PontoCotejo } from '@/lib/publicacao'
import { dataBR } from '@/lib/rotulos'
import { organizarTexto, rotuloDoTrecho, type Trecho } from '@/lib/textoBase'
import type { Proposicao, Versao } from '@/payload-types'

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
export function TextoBase({ lei, analisada, original }: { lei: Proposicao; analisada: Versao | null; original: Versao | null }) {
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
