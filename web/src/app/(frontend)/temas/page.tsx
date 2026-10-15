import type { Metadata } from 'next'
import Link from 'next/link'
import { Trilha } from '@/componentes/Trilha'
import { listarTemasEBiomas } from '@/dados/consultas'

export const revalidate = 300
export const metadata: Metadata = {
  title: 'Temas e biomas da legislação ambiental',
  description: 'Leis e pareceres organizados por área (licenciamento, florestas, água, espécies exóticas…) e por bioma.',
  alternates: { canonical: '/temas' },
}

export default async function TemasEBiomas() {
  const { temas, biomas } = await listarTemasEBiomas()
  return (
    <div className="wrap">
      <Trilha itens={[{ nome: 'Temas e biomas', caminho: '/temas' }]} />
      <header className="lawhead">
        <h1>Temas e biomas</h1>
      </header>
      <section className="section">
        <div className="section-h">
          <h2>Áreas</h2>
        </div>
        <div className="tb-grid">
          {temas.map((t) => (
            <Link key={t.id} href={`/temas/${t.slug}`}>
              {t.nome}
            </Link>
          ))}
        </div>
      </section>
      <section className="section">
        <div className="section-h">
          <h2>Biomas</h2>
        </div>
        <div className="tb-grid">
          {biomas.map((b) => (
            <Link key={b.id} href={`/biomas/${b.slug}`}>
              {b.nome}
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
