import type { Metadata } from 'next'
import Link from 'next/link'
import React from 'react'
import { ContaCabecalho } from '@/componentes/ContaCabecalho'
import { NOME_SITE, SITE_URL } from '@/lib/rotulos'
import './styles.css'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${NOME_SITE} — leis ambientais explicadas`, template: `%s | ${NOME_SITE}` },
  description: 'Observatório da legislação ambiental brasileira: o que está em votação no Congresso e nos estados, com parecer técnico assinado.',
  openGraph: { type: 'website', locale: 'pt_BR', siteName: NOME_SITE },
  robots: { index: true, follow: true },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <header className="head">
          <div className="wrap">
            <Link className="brand" href="/" aria-label={`${NOME_SITE}, página inicial`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/marca/logo.svg" alt={NOME_SITE} width={150} height={46} />
            </Link>
            <nav className="nav" aria-label="Principal">
              <Link href="/leis?esfera=federal">Federais</Link>
              <Link href="/estaduais">Estaduais</Link>
              <Link href="/pareceres">Opinião</Link>
              <Link href="/artigos">Artigos</Link>
              <Link href="/temas">Temas e biomas</Link>
              <Link href="/panorama">Panorama</Link>
            </nav>
            <ContaCabecalho />
          </div>
        </header>
        <main>{children}</main>
        <footer className="foot">
          <div className="wrap">
            <span className="brand">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/marca/logo.svg" alt={NOME_SITE} width={111} height={34} />
            </span>
            <nav aria-label="Rodapé">
              <Link href="/leis">Todas as leis</Link>
              <Link href="/temas">Temas e biomas</Link>
              <Link href="/parlamentares">Parlamentares</Link>
              <Link href="/panorama">Panorama</Link>
              <Link href="/pareceres">Pareceres</Link>
              <Link href="/artigos">Artigos</Link>
              <Link href="/privacidade">Privacidade</Link>
              <Link href="/termos">Termos de uso</Link>
            </nav>
            <small>Pareceres escritos e assinados pelo autor. Textos de lei com link para a fonte oficial.</small>
          </div>
        </footer>
      </body>
    </html>
  )
}
