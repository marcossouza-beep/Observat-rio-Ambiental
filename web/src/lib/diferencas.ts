/**
 * Marcação mecânica do que entrou e saiu entre duas versões do texto, palavra a palavra,
 * como o controle de alterações de um editor de texto. Não interpreta nada.
 */
import { diffWordsWithSpace } from 'diff'

export type Trecho = { tipo: 'igual' | 'incluido' | 'retirado'; texto: string }

export function diferencas(antes: string, depois: string): Trecho[] {
  return diffWordsWithSpace(antes || '', depois || '').map((p) => ({
    tipo: p.added ? 'incluido' : p.removed ? 'retirado' : 'igual',
    texto: p.value,
  }))
}

/** Resumo para o painel: quantas palavras entraram e saíram. */
export function resumoDiferencas(t: Trecho[]) {
  const contar = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0)
  return {
    incluidas: t.filter((x) => x.tipo === 'incluido').reduce((n, x) => n + contar(x.texto), 0),
    retiradas: t.filter((x) => x.tipo === 'retirado').reduce((n, x) => n + contar(x.texto), 0),
  }
}

/** Mostra só os trechos alterados com um pouco de contexto, para textos longos. */
export function recortar(t: Trecho[], contexto = 12): Trecho[] {
  return t.map((x, i) => {
    if (x.tipo !== 'igual') return x
    const palavras = x.texto.split(/(\s+)/)
    const n = palavras.length
    if (n <= contexto * 4) return x
    const inicio = i > 0 ? palavras.slice(0, contexto * 2).join('') : ''
    const fim = i < t.length - 1 ? palavras.slice(n - contexto * 2).join('') : ''
    return { tipo: 'igual', texto: `${inicio}${inicio || fim ? ' […] ' : ''}${fim}` }
  })
}
