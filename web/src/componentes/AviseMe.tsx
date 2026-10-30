'use client'
import Link from 'next/link'
import { useState } from 'react'
import { postar, useSessao } from './useSessao'

/** "Avise-me quando o parecer sair": um e-mail no dia da publicação. */
export function AviseMe({ proposicao, caminho }: { proposicao: number; caminho: string }) {
  const { sessao, recarregar } = useSessao()
  const [email, setEmail] = useState('')
  const [aceito, setAceito] = useState(false)
  const [estado, setEstado] = useState<'' | 'enviando' | 'confira' | 'erro'>('')
  const [erro, setErro] = useState('')
  if (!sessao) return null
  const ligado = sessao.logado && sessao.avisar?.includes(proposicao)
  if (sessao.logado)
    return (
      <div className="linha-acoes">
        <button
          type="button"
          className={`pill-btn ${ligado ? 'claro' : ''}`}
          onClick={async () => {
            await postar('/api/conta/avisar', { proposicao, ligar: !ligado })
            recarregar()
          }}
        >
          {ligado ? '✓ Você será avisado' : 'Avise-me quando o resumo prévio sair'}
        </button>
        <span className="nota-fonte">Grátis. Você recebe um e-mail no dia da publicação.</span>
      </div>
    )
  if (estado === 'confira') return <p className="ok">Quase lá: enviamos um link para {email}. Confirme o e-mail para receber o aviso.</p>
  return (
    <form
      className="form"
      onSubmit={async (e) => {
        e.preventDefault()
        setEstado('enviando')
        const r = await postar('/api/inscricao', { email, consentimento: aceito, avisar: [proposicao], para: caminho, site: (e.currentTarget.elements.namedItem('site') as HTMLInputElement)?.value })
        if (r.ok) setEstado('confira')
        else {
          setEstado('erro')
          setErro(r.erro || 'Não foi possível agora. Tente de novo.')
        }
      }}
    >
      <span className="sub-h">Avise-me quando o resumo prévio sair</span>
      <label className="campo">
        Seu e-mail
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="voce@exemplo.com" />
      </label>
      <input className="oculto" name="site" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <label className="check">
        <input type="checkbox" checked={aceito} onChange={(e) => setAceito(e.target.checked)} required /> Concordo com a{' '}
        <Link href="/privacidade" target="_blank">
          Política de Privacidade
        </Link>
      </label>
      <div className="linha-acoes">
        <button className="pill-btn" type="submit" disabled={estado === 'enviando'}>
          Avise-me
        </button>
        <span className="nota-fonte">Grátis. Um e-mail no dia da publicação. Sem senha.</span>
      </div>
      {estado === 'erro' ? <p className="erro">{erro}</p> : null}
    </form>
  )
}
