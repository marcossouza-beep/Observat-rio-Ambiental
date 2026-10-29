/* eslint-disable @next/next/no-img-element */
const NOME = process.env.NEXT_PUBLIC_NOME_SITE || 'ênfase jur'

/** Ícone do menu do painel (árvore em contorno). */
export function Icone() {
  return <img className="obs-icone" src="/marca/icone.svg" alt="" aria-hidden="true" width={26} height={26} />
}

/** Logo da tela de entrada do painel. */
export function Logo() {
  return (
    <span className="obs-logo">
      <img src="/marca/logo.svg" alt={NOME} width={262} height={80} />
      <small>Painel do autor</small>
    </span>
  )
}
