/**
 * Link rastreável impresso nos PDFs (nota técnica e quadro comparativo).
 * O PDF circula fora do site e pode voltar meses depois; o link leva sempre ao parecer no observatório
 * (versão atual, texto base, histórico) e diz de qual material e de qual versão o leitor veio.
 *   /r/12-nt-v2 → parecer 12, nota técnica, impressa na versão 2 do parecer.
 */

export const MATERIAL_CODIGO = { nota_tecnica: 'nt', quadro_comparativo: 'qc', outro: 'pdf' } as const
export type TipoMaterial = keyof typeof MATERIAL_CODIGO
const TIPO_DO_CODIGO = Object.fromEntries(Object.entries(MATERIAL_CODIGO).map(([k, v]) => [v, k])) as Record<string, TipoMaterial>

export type Rastro = { parecer: number; material: TipoMaterial; versao: number }

export const codigoLink = (r: Rastro) => `${r.parecer}-${MATERIAL_CODIGO[r.material]}-v${Math.max(1, r.versao)}`

export function lerCodigo(codigo: string): Rastro | null {
  const m = /^(\d{1,9})-(nt|qc|pdf)-v(\d{1,4})$/.exec(codigo)
  if (!m) return null
  return { parecer: Number(m[1]), material: TIPO_DO_CODIGO[m[2]], versao: Number(m[3]) }
}

export const caminhoLink = (r: Rastro) => `/r/${codigoLink(r)}`

/** Destino do link: a página do parecer, com a origem para o aviso "você veio de um PDF da versão X". */
export const destinoLink = (slug: string, r: Rastro) => `/resumos/${slug}?pdf=${MATERIAL_CODIGO[r.material]}&v=${r.versao}`

const NOME_MATERIAL: Record<TipoMaterial, string> = { nota_tecnica: 'Parecer técnico', quadro_comparativo: 'Quadro comparativo', outro: 'Material' }
export const nomeMaterial = (t: TipoMaterial) => NOME_MATERIAL[t]

/** Linhas do rodapé carimbado em cada página do PDF. Só caracteres que as fontes padrão do PDF aceitam. */
export function linhasCarimbo(c: {
  site: string
  nomeSite: string
  material: TipoMaterial
  proposta: string
  versao: number
  publicadoEm?: string | null
  textoAnalisado?: string | null
  autor?: string | null
  link: string
  baixadoEm: string
}): [string, string] {
  const l1 = [
    `${c.nomeSite} · ${nomeMaterial(c.material)} sobre ${c.proposta}`,
    `versão ${c.versao}${c.publicadoEm ? `, de ${c.publicadoEm}` : ''}`,
    c.textoAnalisado ? `analisa: ${c.textoAnalisado}` : null,
    c.autor ? `autoria: ${c.autor}` : null,
  ]
    .filter(Boolean)
    .join(' · ')
  const l2 = `Versão atual, texto base e histórico: ${c.site}${c.link} · baixado em ${c.baixadoEm}`
  return [l1, l2]
}
