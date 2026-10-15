'use client'
import { useEffect, useState } from 'react'

export type Sessao = {
  logado: boolean
  nome?: string | null
  email?: string
  perfil?: string | null
  subperfil?: string | null
  curso?: string | null
  uf?: string | null
  alertas?: boolean
  resumoSemanal?: boolean
  aceitaEmails?: boolean
  seguindo?: number[]
  avisar?: number[]
  imprensa?: string | null
}

/** Lê a sessão no navegador (as páginas continuam em cache; só este pedaço é por pessoa). */
export function useSessao() {
  const [s, setS] = useState<Sessao | null>(null)
  const recarregar = () =>
    fetch('/api/sessao', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then(setS)
      .catch(() => setS({ logado: false }))
  useEffect(() => {
    recarregar()
  }, [])
  return { sessao: s, recarregar }
}

export async function postar(url: string, dados: unknown) {
  const r = await fetch(url, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados) })
  const j = await r.json().catch(() => ({}))
  return { ok: r.ok && j.ok !== false, ...j } as { ok: boolean; erro?: string; [k: string]: unknown }
}
