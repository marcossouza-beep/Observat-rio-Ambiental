/**
 * Página de detalhes de uma proposição da Alepa (/Legislativo/DetalhesProposicao?IdProposicao=…): referências
 * (autor, ementa, regime, situação), tramitação ("11/06/2026 - ENVIADO À COMISSÃO…"), votação nas comissões
 * (parecer, relator, PDF), votação no plenário, dados da lei (número, data, Diário Oficial, PDF) e anexos.
 * Cada bloco vem num grupo do DevExpress com o título e itens <p>Campo: valor</p>.
 * Funções puras, testadas sobre páginas reais gravadas em tests/fixtures/coleta/alepa/detalhes-*.json.
 */
import { tipoDoAndamento } from '../classificar'
import { ErroFormato, type AutorColetado, type PacoteProposicao, type StatusSimplificado, type TipoEvento, type TramitacaoColetada, type VersaoColetada } from '../tipos'
import { ALEPA, autorAlepa, siglaAlepa } from './proposicoes'

const texto = (h: string) =>
  h
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()

/** dd/mm/aaaa → aaaa-mm-dd (meio-dia em Brasília, para não mudar de dia no fuso). */
const dataISO = (d?: string) => {
  const m = /(\d{2})\/(\d{2})\/(\d{4})/.exec(d || '')
  return m ? `${m[3]}-${m[2]}-${m[1]}T15:00:00.000Z` : undefined
}

type Campos = Record<string, string>
/** "<p>Relator: DEP. X</p>" → { relator: 'DEP. X' } (chave em minúsculas, sem acento). */
function campos(html: string): Campos {
  const r: Campos = {}
  for (const m of html.matchAll(/<p>([\s\S]*?)<\/p>/g)) {
    const t = texto(m[1])
    const i = t.indexOf(':')
    if (i > 0) r[t.slice(0, i).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()] = t.slice(i + 1).trim()
  }
  return r
}
const pdfDe = (html: string) => /href\s*=\s*"([^"]+\.pdf)"/i.exec(html)?.[1]
/** Itens de um grupo separados pelas caixas com borda (comissões, anexos) ou pelo início de cada turno (plenário). */
const blocos = (html: string) => html.split(/<div style='padding-bottom: 10px;[^']*'>/).filter((b) => /<p>/.test(b))

export type DetalhesAlepa = {
  tipo?: string
  numero?: number
  ano?: number
  dataEntrada?: string
  autor?: string
  ementa?: string
  regime?: string
  situacao?: string
  pdfProjeto?: string
  tramitacao: { data: string; descricao: string }[]
  comissoes: { comissao: string; envio?: string; parecer?: string; dataParecer?: string; relator?: string; pdf?: string }[]
  plenario: { turno: string; data?: string; resultado?: string }[]
  lei?: { numero: string; data?: string; doe?: string; dataDoe?: string; pdf?: string }
  anexos: { nome: string; autor?: string; pdf?: string }[]
}

export function lerDetalhesAlepa(html: string): DetalhesAlepa {
  const grupos = new Map<string, string>()
  const re = /dxnb-ghtext dx-vam">([^<]+)<\/span>([\s\S]*?)(?=dxnb-ghtext dx-vam|Imprimir|$)/g
  for (const m of html.matchAll(re)) {
    const titulo = texto(m[1]).toUpperCase()
    // Cada título aparece duas vezes (cabeçalho fechado e aberto); fica o que tem conteúdo
    if (/<p>/.test(m[2]) && !grupos.has(titulo)) grupos.set(titulo, m[2])
  }
  const ref = campos(grupos.get('REFERÊNCIAS') || '')
  if (!ref['tipo de proposicao'] && !ref.ementa) throw new ErroFormato('alepa', 'REFERÊNCIAS', 'DetalhesProposicao')
  const tramitacao = [...(grupos.get('TRAMITAÇÃO') || '').matchAll(/<p>([\s\S]*?)<\/p>/g)]
    .map((m) => /^(\d{2}\/\d{2}\/\d{4})\s*-\s*(.+)$/.exec(texto(m[1])))
    .filter((m): m is RegExpExecArray => !!m)
    .map((m) => ({ data: dataISO(m[1])!, descricao: m[2] }))
  const comissoes = blocos(grupos.get('VOTAÇÃO NAS COMISSÕES') || '').map((b) => {
    const c = campos(b)
    return { comissao: c.comissao || '', envio: dataISO(c['data do envio']), parecer: c.parecer || undefined, dataParecer: dataISO(c['data do parecer']), relator: c.relator || undefined, pdf: pdfDe(b) }
  })
  const plenario = [...(grupos.get('VOTAÇÃO NO PLENÁRIO') || '').matchAll(/<p>Turno:([\s\S]*?)<\/p>\s*<p>Data:([\s\S]*?)<\/p>\s*<p>Resultado:([\s\S]*?)<\/p>/g)].map((m) => ({
    turno: texto(m[1]),
    data: dataISO(texto(m[2])),
    resultado: texto(m[3]) || undefined,
  }))
  const gLei = grupos.get('DADOS DA LEI')
  const cLei = gLei ? campos(gLei) : {}
  // "Nº da Lei", "Nº do D.O.E." (o º varia: º, °, o)
  const achar = (re: RegExp) => Object.entries(cLei).find(([k]) => re.test(k))?.[1]
  const numeroLei = achar(/^n\S* da lei$/)
  const lei = numeroLei ? { numero: numeroLei, data: dataISO(cLei['data da lei']), doe: achar(/^n\S* do d\.?o\.?e\.?$/), dataDoe: dataISO(achar(/^data do d\.?o\.?e\.?$/)), pdf: pdfDe(gLei!) } : undefined
  const anexos = blocos(grupos.get('ANEXOS') || '').map((b) => {
    const c = campos(b)
    return { nome: c.anexo || 'Anexo', autor: c.autor, pdf: pdfDe(b) }
  })
  return {
    tipo: ref['tipo de proposicao'],
    numero: Number(ref.numero) || undefined,
    // Título da página: "PROJETO DE LEI ORDINÁRIA Nº 461/2026"
    ano: Number(/N\S*\s*\d+\s*\/\s*(\d{4})\s*</.exec(html)?.[1]) || undefined,
    dataEntrada: dataISO(ref['data da entrada']),
    autor: ref.autor,
    ementa: ref.ementa,
    regime: ref.regime,
    situacao: ref.situacao,
    pdfProjeto: /href="(https?:\/\/[^"]*\/Projeto\/\d+\.PDF)"/i.exec(html)?.[1],
    tramitacao,
    comissoes,
    plenario,
    lei,
    anexos,
  }
}

/** Tipo do andamento da Alepa (as regras gerais completam). */
export function eventoAlepa(descricao: string): TipoEvento {
  const t = descricao.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()
  if (/INCLUID[OA] NA PAUTA|ORDEM DO DIA/.test(t)) return 'pauta'
  if (/^TURNO|^REDACAO FINAL|VOTAD[OA] (EM|NO) PLENARIO/.test(t)) return 'votacao'
  if (/VOTAD[OA] NA COMISSAO/.test(t)) return 'parecer_relator'
  if (/PUBLICAD[OA] NO AVULSO|PUBLICACAO DOS? PARECER/.test(t)) return 'outro'
  if (/SANCIONAD|LEI N/.test(t)) return 'sancao'
  if (/VETAD|VETO/.test(t)) return 'veto'
  if (/ARQUIVAD/.test(t)) return 'arquivamento'
  return tipoDoAndamento(descricao)
}

/** Situação simples: lei publicada → norma; aprovada no plenário → aprovada; rejeitada; arquivada; senão, em tramitação. */
export function statusAlepa(d: DetalhesAlepa): StatusSimplificado {
  if (d.lei) return 'norma'
  const ultimo = d.plenario.at(-1)?.resultado?.toUpperCase() || ''
  const s = (d.situacao || '').toUpperCase()
  if (/VETAD/.test(s)) return 'vetada'
  if (/REJEITAD/.test(ultimo) || /REJEITAD/.test(s)) return 'rejeitada'
  if (/APROVAD/.test(ultimo)) return 'aprovada'
  if (/ARQUIVAD/.test(s)) return 'arquivada'
  return 'em_tramitacao'
}

const curta = (d?: string) => (d ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(new Date(d)) : '')

/** Página de detalhes → pacote completo: andamentos, relatores, versões (projeto, pareceres, redação final, lei). */
export function pacoteDosDetalhes(id: number, d: DetalhesAlepa, anoPadrao = new Date().getUTCFullYear()): PacoteProposicao {
  const ano = d.ano || anoPadrao
  const chave = `alepa:proposicao:${id}`
  const sigla = siglaAlepa(d.tipo || '') || 'PL'
  const numero = d.numero || 0
  const tramitacoes: TramitacaoColetada[] = d.tramitacao.map((t, i) => {
    const orgao = /(COMISS[ÃA]O DE .+)$/i.exec(t.descricao)?.[1] || (/PLEN[ÁA]RIO|SESS[ÃA]O|TURNO|REDA[ÇC][ÃA]O FINAL/i.test(t.descricao) ? 'Plenário' : undefined)
    return { chave: `alepa:tram:${id}:${i}`, proposicao: chave, data: t.data, orgao, descricao: t.descricao, tipoEvento: eventoAlepa(t.descricao) }
  })
  // Resultado do plenário completa o andamento do mesmo turno ("TURNO ÚNICO" → "TURNO ÚNICO: APROVADA")
  for (const p of d.plenario) {
    if (!p.data || !p.resultado) continue
    const tipoEvento: TipoEvento = /APROVAD/i.test(p.resultado) ? 'aprovacao' : 'votacao'
    const igual = tramitacoes.find((t) => t.data === p.data && t.descricao.toUpperCase() === p.turno.toUpperCase())
    if (igual) Object.assign(igual, { descricao: `${p.turno}: ${p.resultado}`, tipoEvento })
    else tramitacoes.push({ chave: `alepa:plenario:${id}:${p.turno}`, proposicao: chave, data: p.data, orgao: 'Plenário', descricao: `${p.turno}: ${p.resultado}`, tipoEvento })
  }
  if (d.lei?.data) tramitacoes.push({ chave: `alepa:lei:${id}`, proposicao: chave, data: d.lei.data, orgao: 'Governo do Estado', descricao: `Transformado na Lei nº ${d.lei.numero}${d.lei.doe ? ` (DOE nº ${d.lei.doe}, ${curta(d.lei.dataDoe)})` : ''}`, tipoEvento: 'sancao', urlDocumento: d.lei.pdf })
  tramitacoes.sort((a, b) => a.data.localeCompare(b.data))

  const autor = autorAlepa(d.autor || '')
  const relatores: AutorColetado[] = d.comissoes
    .filter((c) => c.relator)
    .map((c) => {
      const r = autorAlepa(c.relator!)
      return { ...(r?.parlamentar ? { parlamentar: r.parlamentar } : { nomeLivre: r?.nomeLivre || c.relator }), papel: 'relator', orgao: c.comissao, data: c.dataParecer || c.envio }
    })

  const versoes: VersaoColetada[] = []
  if (d.pdfProjeto && d.dataEntrada) versoes.push({ chave: `alepa:texto:${id}`, proposicao: chave, data: d.dataEntrada, tipo: 'original', rotulo: 'Texto original', url: d.pdfProjeto })
  d.comissoes.forEach((c, i) => {
    if (c.pdf && (c.dataParecer || c.envio)) versoes.push({ chave: `alepa:parecer:${id}:${i}`, proposicao: chave, data: (c.dataParecer || c.envio)!, tipo: 'parecer_relator', rotulo: `Parecer ${(c.parecer || '').toLowerCase()} · ${c.comissao}`.replace(/\s+·/, ' ·'), url: c.pdf })
  })
  const dataFinal = d.plenario.find((p) => /REDA[ÇC][ÃA]O FINAL/i.test(p.turno))?.data || d.plenario.at(-1)?.data
  d.anexos.forEach((a, i) => {
    if (a.pdf && /REDA[ÇC][ÃA]O FINAL/i.test(a.nome) && dataFinal) versoes.push({ chave: `alepa:anexo:${id}:${i}`, proposicao: chave, data: dataFinal, tipo: 'redacao_final', rotulo: 'Redação final', url: a.pdf })
  })
  if (d.lei?.pdf && d.lei.data) versoes.push({ chave: `alepa:lei:${id}:texto`, proposicao: chave, data: d.lei.data, tipo: 'norma', rotulo: `Lei nº ${d.lei.numero}`, url: d.lei.pdf })

  const ultima = tramitacoes.at(-1)
  return {
    proposicao: {
      chave,
      casa: 'assembleia',
      esfera: 'estadual',
      uf: 'PA',
      sigla,
      numero,
      ano,
      // Tira da ementa as anotações do expediente ("(Pareceres FAVORÁVEIS…) (Avulso 78, página 44)")
      ementa: (d.ementa || '').replace(/\s*\((?:Pareceres?|Avulso)[^)]*\)/gi, '').trim(),
      dataApresentacao: d.dataEntrada,
      statusOficial: d.lei ? `Lei nº ${d.lei.numero}` : d.situacao,
      statusSimplificado: statusAlepa(d),
      etapa: ultima?.orgao,
      regime: /URG[ÊE]NCIA/i.test(d.regime || '') ? 'urgencia' : 'normal',
      ultimaMovimentacao: ultima?.data || d.dataEntrada,
      urlInteiroTeor: d.pdfProjeto,
      urlFonte: `${ALEPA}/Legislativo/DetalhesProposicao?IdProposicao=${id}`,
      autoria: [...(autor ? [autor] : []), ...relatores],
    },
    tramitacoes,
    versoes,
    votacoes: [],
  }
}
