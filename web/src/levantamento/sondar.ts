/**
 * Sondagem do levantamento regional (Fase 4): acessa os endereços de candidatos.ts, segue os links
 * mais promissores de cada página e grava as evidências em levantamento/resultado.json.
 * Roda no GitHub Actions (.github/workflows/levantamento.yml); daqui a rede dos governos estaduais
 * costuma estar fechada.
 *
 * Uso: pnpm levantamento            (todos os estados)
 *      pnpm levantamento TO,PA,AM   (só alguns)
 */
import https from 'node:https'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { USER_AGENT } from '../coleta/http'
import { ESTADOS, saplPadrao, type Candidato } from './candidatos'
import { linksPromissores, sinaisDe, type Sinais } from './sinais'

export type Sondagem = {
  url: string
  papel: Candidato['papel'] | 'sapl_padrao' | 'link'
  /** Página de onde o link foi tirado, quando veio de um link. */
  de?: string
  status: number | null
  urlFinal?: string
  tipo?: string
  bytes?: number
  ms?: number
  /** O certificado do site é inválido; a leitura foi feita mesmo assim, só para o levantamento. */
  certificadoInvalido?: boolean
  erro?: string
  sinais?: Sinais
}

export type ResultadoOrgao = { uf: string; orgao: 'casa' | 'diario'; nome: string; sigla: string; sondagens: Sondagem[] }
export type Resultado = { geradoEm: string; ambiente: string; orgaos: ResultadoOrgao[] }

const TEMPO = 25_000
const LIMITE_CORPO = 2_000_000

/** Leitura sem validar o certificado (muitos sites estaduais têm a cadeia incompleta). Só para o levantamento. */
function obterInseguro(url: string, saltos = 5): Promise<{ status: number; url: string; tipo: string; corpo: string }> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { rejectUnauthorized: false, headers: { 'user-agent': USER_AGENT }, timeout: TEMPO }, (res) => {
      const loc = res.headers.location
      if (loc && res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && saltos > 0) {
        res.resume()
        const prox = new URL(loc, url).toString()
        if (!prox.startsWith('https:')) return reject(new Error('redireciona para http'))
        return resolve(obterInseguro(prox, saltos - 1))
      }
      const partes: Buffer[] = []
      let total = 0
      res.on('data', (c: Buffer) => {
        total += c.length
        if (total <= LIMITE_CORPO) partes.push(c)
      })
      res.on('end', () => resolve({ status: res.statusCode || 0, url, tipo: String(res.headers['content-type'] || ''), corpo: Buffer.concat(partes).toString('utf8') }))
    })
    req.on('timeout', () => req.destroy(new Error('tempo esgotado')))
    req.on('error', reject)
  })
}

async function ler(url: string) {
  try {
    const r = await fetch(url, { headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/json,application/xml;q=0.9,*/*;q=0.8' }, signal: AbortSignal.timeout(TEMPO), redirect: 'follow' })
    const buf = Buffer.from(await r.arrayBuffer())
    return { status: r.status, url: r.url, tipo: r.headers.get('content-type') || '', corpo: buf.subarray(0, LIMITE_CORPO).toString('utf8'), inseguro: false }
  } catch (e) {
    const causa = String((e as { cause?: { code?: string } }).cause?.code || (e as Error).message)
    if (/CERT|SELF_SIGNED|UNABLE_TO_VERIFY|unable to verify/i.test(causa) && url.startsWith('https:')) {
      const r = await obterInseguro(url)
      return { ...r, inseguro: true }
    }
    throw new Error(causa)
  }
}

async function sondar(url: string, papel: Sondagem['papel'], de?: string): Promise<{ s: Sondagem; corpo?: string }> {
  const t0 = Date.now()
  try {
    const r = await ler(url)
    const s: Sondagem = {
      url,
      papel,
      de,
      status: r.status,
      urlFinal: r.url !== url ? r.url : undefined,
      tipo: r.tipo.split(';')[0],
      bytes: r.corpo.length,
      ms: Date.now() - t0,
      certificadoInvalido: r.inseguro || undefined,
      sinais: sinaisDe(r.corpo, r.tipo, r.url),
    }
    return { s, corpo: r.corpo }
  } catch (e) {
    return { s: { url, papel, de, status: null, ms: Date.now() - t0, erro: (e as Error).message.slice(0, 200) } }
  }
}

async function sondarOrgao(uf: string, orgao: 'casa' | 'diario', nome: string, sigla: string, candidatos: Candidato[]): Promise<ResultadoOrgao> {
  const sondagens: Sondagem[] = []
  const feitos = new Set<string>()
  const lista: { url: string; papel: Sondagem['papel'] }[] = [...candidatos]
  if (orgao === 'casa' && !candidatos.some((c) => c.url === saplPadrao(uf))) lista.push({ url: saplPadrao(uf), papel: 'sapl_padrao' })
  for (const c of lista) {
    if (feitos.has(c.url)) continue
    feitos.add(c.url)
    const { s, corpo } = await sondar(c.url, c.papel)
    sondagens.push(s)
    // Segue os links mais promissores das páginas principais (um nível só)
    if (corpo && s.sinais && !s.sinais.json && !s.sinais.xml && (c.papel === 'site' || c.papel === 'diario' || c.papel === 'proposicoes')) {
      for (const l of linksPromissores(corpo, s.urlFinal || c.url, 6)) {
        if (feitos.has(l)) continue
        feitos.add(l)
        sondagens.push((await sondar(l, 'link', c.url)).s)
      }
    }
  }
  return { uf, orgao, nome, sigla, sondagens }
}

async function main() {
  const filtro = process.argv[2]?.toUpperCase().split(',').filter(Boolean)
  const estados = ESTADOS.filter((e) => !filtro?.length || filtro.includes(e.uf))
  const tarefas = estados.flatMap((e) => [
    () => sondarOrgao(e.uf, 'casa', e.casa.nome, e.casa.sigla, e.casa.candidatos),
    () => sondarOrgao(e.uf, 'diario', e.diario.nome, e.diario.sigla, e.diario.candidatos),
  ])
  // Até 6 órgãos ao mesmo tempo; dentro de cada órgão, um pedido por vez (sem sobrecarregar os sites)
  const orgaos: ResultadoOrgao[] = []
  let i = 0
  await Promise.all(
    Array.from({ length: 6 }, async () => {
      while (i < tarefas.length) {
        const r = await tarefas[i++]()
        orgaos.push(r)
        console.log(`${r.uf} ${r.orgao}: ${r.sondagens.map((s) => s.status ?? 'erro').join(' ')}`)
      }
    }),
  )
  orgaos.sort((a, b) => a.uf.localeCompare(b.uf) || a.orgao.localeCompare(b.orgao))
  const resultado: Resultado = { geradoEm: new Date().toISOString(), ambiente: process.env.GITHUB_ACTIONS ? 'GitHub Actions' : 'local', orgaos }
  const destino = path.resolve(process.cwd(), 'levantamento/resultado.json')
  await mkdir(path.dirname(destino), { recursive: true })
  await writeFile(destino, JSON.stringify(resultado, null, 1) + '\n')
  console.log(`Gravado em ${destino}: ${orgaos.length} órgãos, ${orgaos.reduce((n, o) => n + o.sondagens.length, 0)} endereços.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
