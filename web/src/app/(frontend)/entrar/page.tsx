import type { Metadata } from 'next'
import { FormEntrar } from '@/componentes/FormEntrar'

export const metadata: Metadata = { title: 'Entrar', robots: { index: false, follow: true } }

export default async function Entrar({ searchParams }: { searchParams: Promise<{ para?: string; erro?: string }> }) {
  const s = await searchParams
  return (
    <div className="wrap">
      <header className="lawhead" style={{ paddingTop: 32 }}>
        <h1>Entrar</h1>
        <p style={{ color: 'var(--gray)' }}>Enviamos um link de acesso para o seu e-mail. Não precisa de senha.</p>
      </header>
      <FormEntrar para={s.para && s.para.startsWith('/') && !s.para.startsWith('//') ? s.para : undefined} erroLink={s.erro === 'link'} />
    </div>
  )
}
