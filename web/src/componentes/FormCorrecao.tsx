'use client'
import { useState } from 'react'
import { postar } from './useSessao'

/** "Errou algo? Avise": vira pedido de correção com prazo de resposta (compromisso público). */
export function FormCorrecao({ parecer, prazoDiasUteis }: { parecer: number; prazoDiasUteis: number }) {
  const [aberto, setAberto] = useState(false)
  const [email, setEmail] = useState('')
  const [texto, setTexto] = useState('')
  const [estado, setEstado] = useState<'' | 'enviando' | 'ok' | 'erro'>('')
  const [erro, setErro] = useState('')
  if (estado === 'ok') return <p className="ok">Pedido recebido. Respondemos por e-mail em até {prazoDiasUteis} dias úteis.</p>
  if (!aberto)
    return (
      <button type="button" className="link-btn" onClick={() => setAberto(true)}>
        Encontrou um erro? Avise.
      </button>
    )
  return (
    <form
      className="form"
      onSubmit={async (e) => {
        e.preventDefault()
        setEstado('enviando')
        const r = await postar('/api/pedir-correcao', { parecer, email, texto, site: (e.currentTarget.elements.namedItem('site') as HTMLInputElement)?.value })
        if (r.ok) setEstado('ok')
        else {
          setEstado('erro')
          setErro(r.erro || 'Não foi possível enviar agora.')
        }
      }}
    >
      <label className="campo">
        O que está errado?
        <textarea rows={4} required minLength={10} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Ex.: o placar da votação na comissão foi 21 a 12." />
      </label>
      <label className="campo">
        Seu e-mail, para a resposta
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      </label>
      <input className="oculto" name="site" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <div className="linha-acoes">
        <button className="pill-btn" type="submit" disabled={estado === 'enviando'}>
          Enviar
        </button>
        <span className="nota-fonte">Respondemos em até {prazoDiasUteis} dias úteis. Correções ficam registradas no resumo prévio.</span>
      </div>
      {estado === 'erro' ? <p className="erro">{erro}</p> : null}
    </form>
  )
}
