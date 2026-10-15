'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

/** Marca todas as novidades do Radar como vistas. */
export function MarcarVistos() {
  const router = useRouter()
  const [salvando, setSalvando] = useState(false)
  return (
    <button
      type="button"
      className="obs-btn"
      disabled={salvando}
      onClick={async () => {
        setSalvando(true)
        await fetch('/api/alertas?where[visto][equals]=false&limit=1000', {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ visto: true }),
        })
        setSalvando(false)
        router.refresh()
      }}
    >
      {salvando ? 'Marcando…' : 'Marcar tudo como visto'}
    </button>
  )
}
