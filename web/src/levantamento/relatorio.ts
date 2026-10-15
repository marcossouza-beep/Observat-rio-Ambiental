/**
 * Gera docs/LEVANTAMENTO.md a partir de levantamento/resultado.json (sondagem) e da classificação A–D.
 * Uso: pnpm levantamento:relatorio
 */
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { REGIAO } from '../lib/rotulos'
import { classificar, type Classificacao, type Nivel } from './classificacao'
import type { Resultado, ResultadoOrgao } from './sondar'

const REGIOES = ['Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul']
const NIVEIS: Record<Nivel, string> = {
  A: 'dados estruturados (API, SAPL, JSON/XML)',
  B: 'páginas HTML com a lista',
  C: 'só PDF ou página montada no navegador',
  D: 'cadastro manual',
}

const link = (c: Classificacao) => (c.url ? `[${new URL(c.url).hostname}](${c.url})` : '—')
const celula = (c: Classificacao) => `**${c.nivel}** · ${c.motivo}${c.ajustado ? ' (revisado)' : ''}`

/** Respostas resumidas: quantos endereços responderam e com que problemas. */
function resumo(o: ResultadoOrgao) {
  const ok = o.sondagens.filter((s) => s.status && s.status < 400).length
  const cert = o.sondagens.some((s) => s.certificadoInvalido)
  return `${ok}/${o.sondagens.length}${cert ? ' · certificado inválido' : ''}`
}

async function main() {
  const raiz = process.cwd()
  const r = JSON.parse(await readFile(path.resolve(raiz, 'levantamento/resultado.json'), 'utf8')) as Resultado
  const por = new Map(r.orgaos.map((o) => [`${o.uf}:${o.orgao}`, o]))
  const ufs = [...new Set(r.orgaos.map((o) => o.uf))].sort()
  const conta = { casa: { A: 0, B: 0, C: 0, D: 0 }, diario: { A: 0, B: 0, C: 0, D: 0 } } as Record<'casa' | 'diario', Record<Nivel, number>>
  const linhas: Record<string, string[]> = Object.fromEntries(REGIOES.map((g) => [g, []]))
  const porRegiao: Record<string, Record<Nivel, string[]>> = Object.fromEntries(REGIOES.map((g) => [g, { A: [], B: [], C: [], D: [] }]))
  const sapl: string[] = []
  const semResposta: string[] = []
  for (const uf of ufs) {
    const casa = por.get(`${uf}:casa`)
    const diario = por.get(`${uf}:diario`)
    if (!casa || !diario) continue
    const cc = classificar(casa)
    const cd = classificar(diario)
    conta.casa[cc.nivel]++
    conta.diario[cd.nivel]++
    porRegiao[REGIAO[uf]][cc.nivel].push(uf)
    if (casa.sondagens.some((s) => s.sinais?.sapl && (s.sinais.registros || 0) > 100)) sapl.push(uf)
    for (const [o, c] of [[casa, cc], [diario, cd]] as const) if (/fora do Brasil/.test(c.motivo)) semResposta.push(`${uf} (${o.orgao === 'casa' ? o.sigla : 'diário'})`)
    linhas[REGIAO[uf]].push(`| ${uf} | ${casa.sigla} | ${celula(cc)} | ${link(cc)} | ${resumo(casa)} | ${celula(cd)} | ${link(cd)} | ${resumo(diario)} |`)
  }
  const data = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'long', timeStyle: 'short' }).format(new Date(r.geradoEm))
  const md = [
    '# Levantamento regional (Fase 4)',
    '',
    '> Gerado por `pnpm levantamento:relatorio` a partir da sondagem automática (`web/levantamento/resultado.json`).',
    `> Sondagem de ${data}, rodada em ${r.ambiente}. Não edite à mão: corrija a classificação em \`web/src/levantamento/classificacao.ts\` (AJUSTES) e gere de novo.`,
    '',
    '## Como foi feito',
    '',
    '- Para cada uma das 27 casas legislativas estaduais (26 Assembleias e a Câmara Legislativa do DF) e dos 27 Diários Oficiais, a sondagem acessa os endereços conhecidos (`web/src/levantamento/candidatos.ts`), segue os links mais promissores da página (proposições, dados abertos, API, SAPL, diário) e tenta o SAPL do Interlegis no endereço padrão.',
    '- De cada resposta guarda: situação HTTP, tipo, se é JSON/XML, se é a API do SAPL (e quantas matérias), PDFs, links de proposições, links de dados abertos, página montada no navegador, bloqueio de robô e certificado inválido.',
    '- O nível sai dessas evidências (regra em `classificacao.ts`); quem revisar pode corrigir, e a correção aparece como "(revisado)".',
    '- **Periodicidade:** não é medida pela sondagem. Diários Oficiais costumam sair em dias úteis e as Assembleias publicam conforme as sessões; a confirmação vem da coleta de cada fonte, já na Fase 5.',
    '',
    '## Níveis',
    '',
    '| Nível | O que significa | Como coletar |',
    '|---|---|---|',
    '| A | Dados estruturados: API, SAPL, JSON ou XML | Conector automático direto (o do SAPL serve a todas as casas que o usam) |',
    '| B | Páginas HTML com a lista das proposições ou edições | Conector que lê as páginas; quebra se o site mudar |',
    '| C | Só PDF, ou página que só monta o conteúdo no navegador | Leitura de PDF ou navegador automatizado; frágil e mais lento |',
    '| D | Fora do ar, bloqueado ou sem lista encontrada | Cadastro manual pelo autor no painel |',
    '',
    '## Resumo',
    '',
    '| | A | B | C | D |',
    '|---|---|---|---|---|',
    `| Casas legislativas | ${conta.casa.A} | ${conta.casa.B} | ${conta.casa.C} | ${conta.casa.D} |`,
    `| Diários Oficiais | ${conta.diario.A} | ${conta.diario.B} | ${conta.diario.C} | ${conta.diario.D} |`,
    '',
    '## Por região (casas legislativas)',
    '',
    '| Região | A | B | C | D |',
    '|---|---|---|---|---|',
    ...REGIOES.map((g) => `| ${g} | ${(['A', 'B', 'C', 'D'] as Nivel[]).map((n) => (porRegiao[g][n].length ? `${porRegiao[g][n].length} (${porRegiao[g][n].join(', ')})` : '0')).join(' | ')} |`),
    '',
    '## O que os números dizem',
    '',
    `- **SAPL (Interlegis):** ${sapl.length} casas respondem pela mesma API (${sapl.join(', ')}). Um único conector do SAPL cobre todas, com o mesmo formato de matéria, tramitação e autoria.`,
    `- **Diários Oficiais:** nenhum tem API; todos publicam edições em PDF ou em consulta por data. Para os estados, o diário é fonte de confirmação (lei publicada, veto), não de acompanhamento diário.`,
    `- **Sem resposta de fora do Brasil (${semResposta.length}):** ${semResposta.join(', ')}. Falharam em todas as rodadas (três, em 15/10/2026) por tempo esgotado ou conexão recusada, o que costuma indicar bloqueio de acesso estrangeiro. A coleta desses estados precisa rodar de um servidor no Brasil; a confirmação vem do teste a partir de lá.`,
    `- **Região-piloto (Fase 5):** a região com mais casas em nível A é ${REGIOES.slice().sort((a, b) => porRegiao[b].A.length - porRegiao[a].A.length)[0]}.`,
    '',
    ...REGIOES.flatMap((g) => [
      `## ${g}`,
      '',
      '| UF | Casa | Nível da casa | Onde | Respostas | Nível do diário | Onde | Respostas |',
      '|---|---|---|---|---|---|---|---|',
      ...linhas[g],
      '',
    ]),
    '"Respostas" mostra quantos endereços sondados responderam sem erro.',
    '',
    `Níveis: ${Object.entries(NIVEIS).map(([k, v]) => `${k} = ${v}`).join('; ')}.`,
    '',
  ].join('\n')
  const destino = path.resolve(raiz, '../docs/LEVANTAMENTO.md')
  await writeFile(destino, md)
  console.log(`Gravado em ${destino}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
