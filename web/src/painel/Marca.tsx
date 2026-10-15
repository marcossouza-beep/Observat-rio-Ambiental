const NOME = process.env.NEXT_PUBLIC_NOME_SITE || 'Nome do Site'

export function Icone() {
  return <span className="obs-gota" aria-hidden="true" />
}

export function Logo() {
  return (
    <span className="obs-logo">
      <span className="obs-gota" aria-hidden="true" />
      {NOME} <small>Painel do autor</small>
    </span>
  )
}
