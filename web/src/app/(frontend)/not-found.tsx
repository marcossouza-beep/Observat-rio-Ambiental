import Link from 'next/link'

export default function NaoEncontrado() {
  return (
    <div className="wrap">
      <section className="hero">
        <h1>Página não encontrada</h1>
        <p>O endereço pode ter mudado. Tente a busca ou volte ao início.</p>
        <p>
          <Link className="pill-btn" href="/">
            Ir para o início
          </Link>
        </p>
      </section>
    </div>
  )
}
