'use client'
import Link from 'next/link'
import { postar, useSessao } from './useSessao'

/** Seguir um parlamentar: os votos dele em propostas ambientais entram no resumo semanal. */
export function SeguirParlamentar({ parlamentar, caminho }: { parlamentar: number; caminho: string }) {
  const { sessao, recarregar } = useSessao()
  if (!sessao) return null
  if (!sessao.logado)
    return (
      <Link className="pill-btn claro" href={`/inscricao?para=${encodeURIComponent(caminho)}`}>
        Seguir
      </Link>
    )
  const ligado = sessao.seguirParlamentares?.includes(parlamentar)
  return (
    <button
      type="button"
      className={`pill-btn ${ligado ? 'claro' : ''}`}
      onClick={async () => {
        await postar('/api/conta/seguir-parlamentar', { parlamentar, ligar: !ligado })
        recarregar()
      }}
    >
      {ligado ? '✓ Seguindo' : 'Seguir'}
    </button>
  )
}
