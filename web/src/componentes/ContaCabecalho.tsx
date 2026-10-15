'use client'
import Link from 'next/link'
import { useSessao } from './useSessao'

const iniciais = (n?: string | null, e?: string) =>
  (n || e || '?')
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')

export function ContaCabecalho() {
  const { sessao } = useSessao()
  if (!sessao) return <span className="conta-cab" aria-hidden="true" />
  if (sessao.logado)
    return (
      <span className="conta-cab">
        <Link className="avatar" href="/conta" aria-label="Minha conta" title="Minha conta">
          {iniciais(sessao.nome, sessao.email)}
        </Link>
      </span>
    )
  return (
    <span className="conta-cab">
      <Link className="entrar" href="/entrar">
        Entrar
      </Link>
      <Link className="pill-btn" href="/inscricao">
        Se inscreva grátis
      </Link>
    </span>
  )
}
