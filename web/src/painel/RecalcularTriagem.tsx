'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

/** Refaz nota e termos das propostas na Triagem com o dicionário de palavras-chave atual. */
export function RecalcularTriagem() {
  const router = useRouter()
  const [estado, setEstado] = useState('')
  return (
    <span className="obs-acoes">
      <button
        type="button"
        className="obs-btn"
        disabled={estado === 'calculando'}
        title="Use depois de mudar as palavras-chave: as notas e as sugestões de área e bioma passam a usar o dicionário atual"
        onClick={async () => {
          setEstado('calculando')
          const r = await fetch('/api/triagem/recalcular', { method: 'POST', credentials: 'include' })
          const j = await r.json().catch(() => ({}))
          setEstado(r.ok ? `${j.propostas} recalculadas, ${j.mudaram} com nota nova` : `Erro ${r.status}`)
          router.refresh()
        }}
      >
        {estado === 'calculando' ? 'Recalculando…' : 'Recalcular notas'}
      </button>
      {estado && estado !== 'calculando' ? <span className="obs-nota">{estado}</span> : null}
    </span>
  )
}
