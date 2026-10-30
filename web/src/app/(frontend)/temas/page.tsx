import type { Metadata } from 'next'
import Link from 'next/link'
import { BarraCarater } from '@/componentes/Padrao'
import { Trilha } from '@/componentes/Trilha'
import { dadosDoPanorama } from '@/dados/consultas'
import { agrupar, padrao } from '@/lib/panorama'

export const revalidate = 300
export const metadata: Metadata = {
  title: 'Temas e biomas da legislação ambiental',
  description: 'Leis e resumos prévios organizados por área (licenciamento, florestas, água, espécies exóticas…) e por bioma.',
  alternates: { canonical: '/temas' },
}

function Cartao({ href, nome, itens }: { href: string; nome: string; itens: Parameters<typeof padrao>[0] }) {
  const p = padrao(itens)
  return (
    <Link href={href} className="tb-card">
      <b>{nome}</b>
      <small>{p.total ? `${p.total} ${p.total === 1 ? 'resumo prévio' : 'resumos prévios'} · ${p.altoImpacto}% de alto impacto` : 'Sem resumos prévios ainda'}</small>
      {p.total ? <BarraCarater d={p.tudo} fina /> : null}
    </Link>
  )
}

export default async function TemasEBiomas() {
  const { temas, biomas, itens } = await dadosDoPanorama()
  const porArea = agrupar(itens, (i) => i.areas)
  const porBioma = agrupar(itens, (i) => i.biomas)
  return (
    <div className="wrap">
      <Trilha itens={[{ nome: 'Temas e biomas', caminho: '/temas' }]} />
      <header className="lawhead">
        <h1>Temas e biomas</h1>
      </header>
      <section className="section">
        <div className="section-h">
          <h2>Biomas</h2>
          <Link href="/panorama?aba=biomas">Ver no Panorama</Link>
        </div>
        <div className="tb-grid">
          {biomas.map((b) => (
            <Cartao key={b.id} href={`/biomas/${b.slug}`} nome={b.nome} itens={porBioma.get(String(b.id)) || []} />
          ))}
        </div>
      </section>
      <section className="section">
        <div className="section-h">
          <h2>Áreas</h2>
          <Link href="/panorama?aba=areas">Ver no Panorama</Link>
        </div>
        <div className="tb-grid">
          {temas.map((t) => (
            <Cartao key={t.id} href={`/temas/${t.slug}`} nome={t.nome} itens={porArea.get(String(t.id)) || []} />
          ))}
        </div>
      </section>
    </div>
  )
}
