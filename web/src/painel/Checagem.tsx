'use client'
import { useAllFormFields } from '@payloadcms/ui'
import { checarPublicacao, SECOES_PARECER } from '../lib/publicacao'

/** Travas e avisos de publicação, ao vivo, e o que o sistema faz sozinho ao publicar. */
export function Checagem() {
  const [campos] = useAllFormFields()
  const v = (k: string) => campos?.[k]?.value as never
  const secoes = Object.fromEntries(SECOES_PARECER.map((s) => [s.nome, v(`secoes.${s.nome}`)]))
  const versao = (v('versao') as number | undefined) ?? 1
  const r = checarPublicacao({
    secoes,
    impacto: v('impacto'),
    carater: v('carater'),
    versao,
    notaDaVersao: v('notaDaVersao'),
    temNotaTecnica: !!v('materiais.notaTecnica'),
    seo: { tituloSeo: v('seo.tituloSeo'), metaDescricao: v('seo.metaDescricao') },
  })
  return (
    <div className="obs-checagem">
      <h4>Antes de publicar</h4>
      <p className="obs-nota">{r.secoesEscritas} de {SECOES_PARECER.length} seções escritas</p>
      <ul>
        {r.travas.map((t) => (
          <li key={t} className="r">
            ✕ {t}
          </li>
        ))}
        {r.avisos.map((t) => (
          <li key={t} className="y">
            ! {t}
          </li>
        ))}
        {r.pode && !r.avisos.length ? <li className="g">✓ Tudo pronto</li> : null}
      </ul>
      <h4>Ao publicar, o sistema faz sozinho</h4>
      <ol>
        <li>{versao > 1 ? 'Troca a faixa “atualização em preparação” pela nova versão' : 'Troca o aviso “Parecer em preparação” pelo parecer, no mesmo endereço'}</li>
        <li>Cumpre o compromisso público e tira o parecer da fila</li>
        <li>Atualiza a página da lei, listas, temas, biomas e o sitemap</li>
      </ol>
    </div>
  )
}
