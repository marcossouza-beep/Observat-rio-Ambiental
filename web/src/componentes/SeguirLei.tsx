'use client'
import Link from 'next/link'
import { postar, useSessao } from './useSessao'

export function SeguirLei({ proposicao, caminho }: { proposicao: number; caminho: string }) {
  const { sessao, recarregar } = useSessao()
  if (!sessao) return null
  if (!sessao.logado)
    return (
      <Link className="link-oficial" href={`/inscricao?para=${encodeURIComponent(caminho)}`}>
        Seguir esta lei
      </Link>
    )
  const ligado = sessao.seguindo?.includes(proposicao)
  return (
    <button
      type="button"
      className={`pill-btn ${ligado ? 'claro' : ''}`}
      style={{ justifySelf: 'start' }}
      onClick={async () => {
        await postar('/api/conta/seguir', { proposicao, ligar: !ligado })
        recarregar()
      }}
    >
      {ligado ? '✓ Seguindo esta lei' : 'Seguir esta lei'}
    </button>
  )
}
