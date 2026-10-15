/**
 * Sugestão para erro de digitação no domínio do e-mail ("gmial.com" → "gmail.com").
 * É só uma sugestão: a pessoa decide se aceita.
 */

const COMUNS = [
  'gmail.com', 'hotmail.com', 'hotmail.com.br', 'outlook.com', 'outlook.com.br', 'live.com', 'msn.com',
  'yahoo.com', 'yahoo.com.br', 'ymail.com', 'icloud.com', 'me.com', 'uol.com.br', 'bol.com.br',
  'terra.com.br', 'ig.com.br', 'globo.com', 'globomail.com', 'protonmail.com', 'proton.me',
]

function distancia(a: string, b: string): number {
  const linha = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    let anterior = linha[0]
    linha[0] = i
    for (let j = 1; j <= b.length; j++) {
      const guardado = linha[j]
      linha[j] = Math.min(linha[j] + 1, linha[j - 1] + 1, anterior + (a[i - 1] === b[j - 1] ? 0 : 1))
      anterior = guardado
    }
  }
  return linha[b.length]
}

export function sugerirEmail(email: string): string | null {
  const m = /^([^@\s]+)@([^@\s]+)$/.exec(email.trim().toLowerCase())
  if (!m) return null
  const [, usuario, dominio] = m
  if (COMUNS.includes(dominio) || dominio.length < 5) return null
  let melhor: string | null = null
  let menor = 3
  for (const c of COMUNS) {
    const d = distancia(dominio, c)
    if (d < menor) {
      menor = d
      melhor = c
    }
  }
  return melhor ? `${usuario}@${melhor}` : null
}
