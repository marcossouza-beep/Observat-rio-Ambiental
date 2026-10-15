/**
 * "O que já se sabe": frase montada só com fatos da tramitação, para leis ainda sem parecer.
 * Nenhuma interpretação; tudo vem das fontes oficiais.
 */
import { artigo, dataBR, deUF } from './rotulos'

export type FatosLei = {
  sigla: string
  rotulo?: string | null
  esfera: 'federal' | 'estadual' | 'municipal' | string
  uf?: string | null
  statusSimplificado?: string | null
  statusOficial?: string | null
  autores?: { nome: string; partido?: string | null; uf?: string | null }[]
  ultimaVotacao?: { data: string; orgao?: string | null; sim?: number | null; nao?: number | null } | null
  emendas?: number
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function oQueJaSeSabe(entrada: FatosLei): string {
  const f = { ...entrada, rotulo: entrada.rotulo || '' }
  const art = artigo(f.sigla)
  const Art = cap(art)
  if (/^decreto/i.test(f.sigla)) {
    return `${Art} ${f.rotulo} foi editado pela Presidência da República e já está em vigor. Decretos não passam por votação no Congresso.`
  }
  if (/^MPV?$/i.test(f.sigla)) {
    return `${Art} ${f.rotulo} foi editada pela Presidência da República e vale desde a publicação. O Congresso tem até 120 dias para aprová-la ou rejeitá-la.`
  }
  const casa = f.esfera === 'federal' ? 'no Congresso Nacional' : f.uf ? `na Assembleia Legislativa ${deUF(f.uf)}` : 'na casa legislativa'
  const virouNorma = f.statusSimplificado === 'norma' || f.statusSimplificado === 'aprovada'
  const feminino = art === 'a'
  const partes: string[] = []
  partes.push(virouNorma ? `${Art} ${f.rotulo} foi ${feminino ? 'aprovada' : 'aprovado'} ${casa}` : `${Art} ${f.rotulo} tramita ${casa}`)
  const a = f.autores?.[0]
  if (a) partes[0] += `; a autoria é de ${a.nome}${a.partido ? ` (${a.partido}${a.uf ? `-${a.uf}` : ''})` : ''}`
  partes[0] += '.'
  if (!virouNorma && f.statusOficial) partes.push(`Situação oficial: ${f.statusOficial.replace(/\.$/, '')}.`)
  const v = f.ultimaVotacao
  if (v && v.sim != null && v.nao != null) partes.push(`Na última votação, em ${dataBR(v.data)}${v.orgao ? `, ${v.orgao}` : ''}, o placar foi ${v.sim} a ${v.nao}.`)
  else if (!virouNorma) partes.push('Ainda não houve votação.')
  const ne = f.emendas ?? 0
  if (ne === 1) partes.push('Foi apresentada 1 emenda.')
  else if (ne > 1) partes.push(`Foram apresentadas ${ne} emendas.`)
  else if (!virouNorma) partes.push('Nenhuma emenda foi apresentada até agora.')
  return partes.join(' ')
}
