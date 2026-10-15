'use client'
import Link from 'next/link'
import { useState } from 'react'
import { postar } from './useSessao'

export function FormEntrar({ para, erroLink }: { para?: string; erroLink?: boolean }) {
  const [email, setEmail] = useState('')
  const [estado, setEstado] = useState<'' | 'enviando' | 'ok' | 'erro'>('')
  const [erro, setErro] = useState('')
  if (estado === 'ok')
    return (
      <div className="caixa">
        <h2>Confira seu e-mail</h2>
        <p>Se houver uma inscrição com {email}, enviamos um link de acesso. Ele vale por 1 hora e só funciona uma vez.</p>
      </div>
    )
  return (
    <form
      className="caixa form"
      onSubmit={async (e) => {
        e.preventDefault()
        setEstado('enviando')
        const r = await postar('/api/entrar', { email, para })
        if (r.ok) setEstado('ok')
        else {
          setEstado('erro')
          setErro(r.erro || 'Não foi possível agora.')
        }
      }}
    >
      {erroLink ? <p className="alerta">Esse link expirou ou já foi usado. Peça outro abaixo.</p> : null}
      <label className="campo">
        Seu e-mail
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      </label>
      <div className="linha-acoes">
        <span className="nota-fonte">
          Ainda não se inscreveu? <Link href="/inscricao">Inscreva-se grátis</Link>
        </span>
        <button className="pill-btn" type="submit" disabled={estado === 'enviando'}>
          Enviar link de acesso
        </button>
      </div>
      {estado === 'erro' ? <p className="erro">{erro}</p> : null}
    </form>
  )
}
