import Link from 'next/link'
import { jsonLdTrilha } from '@/lib/seo'
import { JsonLd } from './JsonLd'

export function Trilha({ itens }: { itens: { nome: string; caminho: string }[] }) {
  const todos = [{ nome: 'Início', caminho: '/' }, ...itens]
  return (
    <>
      <nav className="trilha" aria-label="Você está em">
        {todos.map((it, i) => (
          <span key={it.caminho}>
            {i < todos.length - 1 ? <Link href={it.caminho}>{it.nome}</Link> : <span aria-current="page">{it.nome}</span>}
            {i < todos.length - 1 ? ' ›' : ''}
          </span>
        ))}
      </nav>
      <JsonLd dados={jsonLdTrilha(todos)} />
    </>
  )
}
