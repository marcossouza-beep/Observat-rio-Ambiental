import React from 'react'
import './styles.css'

export const metadata = {
  description: 'Observatório da legislação ambiental brasileira, com pareceres técnicos assinados.',
  title: 'Observatório Ambiental',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
