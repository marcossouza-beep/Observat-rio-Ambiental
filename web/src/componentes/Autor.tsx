import Link from 'next/link'
import type { Autor as TAutor, Media } from '@/payload-types'

const iniciais = (n: string) =>
  n
    .split(/\s+/)
    .filter((p) => p.length > 2)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('')

/** Assinatura discreta no topo do parecer: foto, nome, título e redes (docs/TELAS.md, A3b). */
export function Assinatura({ autor }: { autor?: TAutor | number | null }) {
  if (!autor || typeof autor !== 'object') return null
  const foto = autor.foto && typeof autor.foto === 'object' ? (autor.foto as Media) : null
  const redes = [
    ['LinkedIn', autor.redes?.linkedin],
    ['Lattes', autor.redes?.lattes],
    ['Instagram', autor.redes?.instagram],
    ['X', autor.redes?.x],
  ].filter(([, v]) => v) as [string, string][]
  return (
    <div className="byline">
      {foto?.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={foto.url} alt={foto.alt || autor.nome} width={36} height={36} />
      ) : (
        <span className="av" aria-hidden="true">
          {iniciais(autor.nome)}
        </span>
      )}
      <span>
        Por{' '}
        <Link href={`/autores/${autor.slug}`}>
          <b>{autor.nome}</b>
        </Link>
        {autor.titulo ? ` · ${autor.titulo}` : ''}
      </span>
      {redes.length ? (
        <span className="redes">
          {redes.map(([n, v]) => (
            <a key={n} href={v} rel="me noopener" target="_blank">
              {n}
            </a>
          ))}
        </span>
      ) : null}
    </div>
  )
}

export const redesDe = (a?: TAutor | number | null) =>
  a && typeof a === 'object' ? [a.redes?.linkedin, a.redes?.lattes, a.redes?.instagram, a.redes?.x] : []
