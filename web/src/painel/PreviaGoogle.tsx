'use client'
import { useAllFormFields } from '@payloadcms/ui'

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://nomedosite.com.br').replace(/^https?:\/\//, '').replace(/\/$/, '')
const NOME = process.env.NEXT_PUBLIC_NOME_SITE || 'Nome do Site'

/** Prévia do resultado no Google e contadores (docs/SEO.md, seção 3). */
export function PreviaGoogle() {
  const [campos] = useAllFormFields()
  const v = (k: string) => (campos?.[k]?.value as string | undefined) || ''
  const titulo = v('seo.tituloSeo') || v('titulo')
  const desc = v('seo.metaDescricao')
  const kw = v('seo.palavraChave').toLowerCase()
  const slug = v('slug')
  const checks = [
    [!!kw && titulo.toLowerCase().includes(kw.split(' ')[0] || '~'), 'Palavra-chave no título'],
    [!!kw && slug.includes((kw.split(' ')[0] || '~').toLowerCase()), 'Palavra-chave no endereço'],
    [titulo.length > 0 && titulo.length <= 60, `Título com até 60 caracteres (${titulo.length})`],
    [desc.length > 0 && desc.length <= 155, `Descrição com até 155 caracteres (${desc.length})`],
  ] as const
  return (
    <div className="obs-previa">
      <div className="obs-google">
        <div className="u">
          {SITE} › pareceres › {slug || '…'}
        </div>
        <div className="t">
          {titulo || 'Título do parecer'} | {NOME}
        </div>
        <div className="d">{desc || 'A descrição aparece aqui. Sem ela, usamos a primeira frase do resumo com impacto e caráter.'}</div>
      </div>
      <ul className="obs-checagem">
        {checks.map(([ok, t]) => (
          <li key={t} className={ok ? 'g' : 'y'}>
            {ok ? '✓' : '!'} {t}
          </li>
        ))}
      </ul>
    </div>
  )
}
