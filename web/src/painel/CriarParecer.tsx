'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

/** Cria o rascunho do parecer ligado à proposição e abre o editor. */
export function CriarParecer({ proposicao }: { proposicao: number | string }) {
  const router = useRouter()
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  async function criar() {
    setSalvando(true)
    const r = await fetch('/api/pareceres', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proposicao, status: 'rascunho' }),
    })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) {
      setSalvando(false)
      setErro(j?.errors?.[0]?.message || `Erro ${r.status}`)
      return
    }
    router.push(`/admin/collections/pareceres/${j.doc.id}`)
  }
  return (
    <span className="obs-acoes coluna">
      <button type="button" className="obs-btn p" disabled={salvando} onClick={criar}>
        Começar resumo prévio
      </button>
      {erro ? <span className="obs-erro">{erro}</span> : null}
    </span>
  )
}
