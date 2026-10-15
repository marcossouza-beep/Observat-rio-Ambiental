import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Descadastro', robots: { index: false } }

export default async function Descadastro({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const ok = (await searchParams).ok === '1'
  return (
    <div className="wrap">
      <section className="hero">
        <h1>{ok ? 'Pronto, você não recebe mais e-mails' : 'Link inválido'}</h1>
        <p>{ok ? 'Sua inscrição continua ativa para baixar os materiais. Você pode voltar a receber e-mails na sua conta quando quiser.' : 'Entre na sua conta para ajustar os e-mails que recebe.'}</p>
        <p>
          <Link className="pill-btn" href="/conta">
            Minha conta
          </Link>
        </p>
      </section>
    </div>
  )
}
