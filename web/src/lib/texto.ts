/** Endereços (slugs) em minúsculas, sem acento, com hífen. */
export function slugify(t: string): string {
  return t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/nº|n°/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
}

/** "PL 1234/2026" → "pl-1234-2026"; usado no início do endereço de leis e pareceres. */
export function slugProposicao(sigla: string, numero: number | string, ano: number | string, assunto?: string) {
  const base = slugify(`${sigla} ${String(numero).replace(/\D/g, '')} ${ano}`)
  return assunto ? `${base}-${slugify(assunto)}`.slice(0, 90).replace(/-+$/, '') : base
}

/** Número com separador de milhar: 1234 → "1.234". */
export const numeroBR = (n: number) => n.toLocaleString('pt-BR')

/** "PL nº 1.234/2026" */
export function rotuloProposicao(sigla: string, numero: number, ano: number) {
  return `${sigla} nº ${numeroBR(numero)}/${ano}`
}
