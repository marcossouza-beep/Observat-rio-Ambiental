/**
 * Texto base da proposta, como aparece no topo do parecer: o texto extraído do arquivo oficial, organizado
 * em dispositivos (artigos, parágrafos, incisos, alíneas) e com a justificação do autor separada.
 * Não reescreve nada: só junta as linhas quebradas pela extração do PDF e marca o tipo de cada trecho.
 */

export type TipoTrecho = 'divisao' | 'artigo' | 'paragrafo' | 'inciso' | 'alinea' | 'texto'
export type Trecho = { tipo: TipoTrecho; texto: string }
export type TextoBase = { dispositivos: Trecho[]; justificacao: string[] }

const INICIO: [RegExp, TipoTrecho][] = [
  [/^(?:T[ÍI]TULO|CAP[ÍI]TULO|SE[ÇC][ÃA]O|SUBSE[ÇC][ÃA]O|LIVRO)\s+[IVXLC\dÚU]/i, 'divisao'],
  [/^Art\.?\s*\d/i, 'artigo'],
  [/^(?:§\s*\d|Par[áa]grafo\s+[úu]nico)/i, 'paragrafo'],
  [/^[IVXLC]+\s*[-–—]\s*/, 'inciso'],
  [/^[a-z]\)\s/, 'alinea'],
]

const JUSTIFICACAO = /^(?:JUSTIFICA[ÇC][ÃA]O|JUSTIFICATIVA|EXPOSI[ÇC][ÃA]O DE MOTIVOS|MENSAGEM)\b/i

const tipoDe = (linha: string): TipoTrecho | null => INICIO.find(([re]) => re.test(linha))?.[1] ?? null

/**
 * "Art. 1º Fica criada ... no\nmunicípio de ... ." → um trecho só. Uma linha começa trecho novo quando abre
 * um dispositivo ou quando a anterior termina frase (., :, ;) e esta começa com maiúscula.
 */
export function organizarTexto(texto: string | null | undefined): TextoBase {
  const linhas = (texto || '')
    .replace(/\r/g, '')
    .replace(/-\n(?=[a-zà-ú])/g, '') // palavra hifenizada na quebra de linha
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean)

  const dispositivos: Trecho[] = []
  const justificacao: string[] = []
  let naJustificacao = false
  for (const l of linhas) {
    if (!naJustificacao && JUSTIFICACAO.test(l)) {
      naJustificacao = true
      const resto = l.replace(JUSTIFICACAO, '').replace(/^[\s.:–-]+/, '')
      if (resto) justificacao.push(resto)
      continue
    }
    const lista = naJustificacao ? null : dispositivos
    const tipo = tipoDe(l)
    if (lista) {
      const ultimo = lista[lista.length - 1]
      const fechaFrase = ultimo && /[.:;]$/.test(ultimo.texto) && /^[A-ZÀ-Ú"“(]/.test(l)
      // Título de divisão é curto e vem com o nome na linha seguinte ("CAPÍTULO I" / "DAS DISPOSIÇÕES GERAIS")
      const nomeDaDivisao = ultimo?.tipo === 'divisao' && !tipo && l === l.toUpperCase()
      if (!ultimo || tipo || (fechaFrase && !nomeDaDivisao)) lista.push({ tipo: tipo || 'texto', texto: l })
      else ultimo.texto += nomeDaDivisao ? ` · ${l}` : ` ${l}`
    } else {
      const ultimo = justificacao.length - 1
      if (ultimo >= 0 && !/[.:;!?]$/.test(justificacao[ultimo])) justificacao[ultimo] += ` ${l}`
      else justificacao.push(l)
    }
  }
  // Um texto corrido sem quebras ("Art. 3º ... Art. 7º ...") também é separado nos dispositivos
  return { dispositivos: dispositivos.flatMap(separarCorrido), justificacao }
}

function separarCorrido(t: Trecho): Trecho[] {
  const partes = t.texto.split(/(?<=[.:;])\s+(?=(?:Art\.\s*\d+[º°o.]?|§\s*\d+[º°o]?|Par[áa]grafo\s+[úu]nico)\s)/)
  if (partes.length === 1) return [t]
  return partes.map((p, i) => ({ tipo: (i === 0 ? t.tipo : tipoDe(p)) || 'texto', texto: p }))
}

/** Rótulo e número do dispositivo para o destaque na leitura: "Art. 3º", "§ 2º", "Parágrafo único", "IV", "a)". */
export function rotuloDoTrecho(t: Trecho): { rotulo: string; resto: string } {
  const m =
    t.tipo === 'artigo'
      ? /^(Art\.?\s*\d+(?:\.\d+)*\s*[º°o]?(?:-[A-Z])?\.?)\s*/i.exec(t.texto)
      : t.tipo === 'paragrafo'
        ? /^(§\s*\d+\s*[º°o]?\.?|Par[áa]grafo\s+[úu]nico\.?)\s*/i.exec(t.texto)
        : t.tipo === 'inciso'
          ? /^([IVXLC]+\s*[-–—])\s*/.exec(t.texto)
          : t.tipo === 'alinea'
            ? /^([a-z]\))\s*/.exec(t.texto)
            : null
  return m ? { rotulo: m[1].trim(), resto: t.texto.slice(m[0].length) } : { rotulo: '', resto: t.texto }
}
