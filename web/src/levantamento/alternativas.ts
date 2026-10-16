/**
 * Testa as alternativas de coleta para os estados do Norte sem API aberta (Pará, Amapá, Roraima):
 *   - navegador de verdade (Playwright) nas páginas de proposições e do Diário Oficial do Legislativo,
 *     anotando as chamadas que a página faz por trás (de onde vem a lista);
 *   - o SAPL de Roraima identificado como navegador, em vez de robô;
 *   - o Diário da ALE-RR (WordPress): API do WordPress e leitura do PDF mais recente;
 *   - leitura do PDF mais recente que aparecer nas páginas de diário.
 * Grava as evidências em levantamento/alternativas.json. Roda no GitHub Actions (rede de fora do Brasil).
 *
 * Uso: pnpm levantamento:alternativas
 */
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { chromium, type Browser, type Response as RespostaPw } from '@playwright/test'
import { USER_AGENT } from '../coleta/http'
import { extrairTextoPdf } from '../coleta/textos'
import { ESTADOS } from './candidatos'

const NAVEGADOR = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'
const curto = (t: string, n = 300) => t.replace(/\s+/g, ' ').trim().slice(0, n)
const erro = (e: unknown) => {
  const x = e as Error & { cause?: { code?: string } }
  return `${x.message}${x.cause?.code ? ` (${x.cause.code})` : ''}`.slice(0, 200)
}

/** Acesso direto, como robô ou como navegador. */
async function direto(url: string, comoNavegador: boolean) {
  try {
    const r = await fetch(url, {
      headers: comoNavegador
        ? { 'User-Agent': NAVEGADOR, Accept: 'text/html,application/json;q=0.9,*/*;q=0.8', 'Accept-Language': 'pt-BR,pt;q=0.9' }
        : { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: AbortSignal.timeout(25_000),
      redirect: 'follow',
    })
    const corpo = await r.text()
    return { url, comoNavegador, status: r.status, tipo: r.headers.get('content-type'), servidor: r.headers.get('server'), bytes: corpo.length, inicio: curto(corpo) }
  } catch (e) {
    return { url, comoNavegador, erro: erro(e) }
  }
}

/** Abre a página num navegador de verdade e anota o que ela busca por trás (XHR/fetch), os links de PDF e o texto visível. */
async function navegar(b: Browser, url: string, interagir = false) {
  const ctx = await b.newContext({ userAgent: NAVEGADOR, locale: 'pt-BR', ignoreHTTPSErrors: true })
  const p = await ctx.newPage()
  const chamadas: { url: string; status: number; tipo: string | null; bytes?: number; inicio?: string }[] = []
  p.on('response', async (r: RespostaPw) => {
    const tipoRecurso = r.request().resourceType()
    if (tipoRecurso !== 'xhr' && tipoRecurso !== 'fetch') return
    const tipo = r.headers()['content-type'] || null
    let corpo = ''
    try {
      corpo = /json|html|xml|text/.test(tipo || '') ? await r.text() : ''
    } catch {}
    chamadas.push({ url: r.url(), status: r.status(), tipo, bytes: corpo.length || undefined, inicio: corpo ? curto(corpo, 400) : undefined })
  })
  try {
    const r = await p.goto(url, { waitUntil: 'networkidle', timeout: 45_000 })
    await p.waitForTimeout(2500)
    if (interagir) {
      // Pesquisa sem filtro: o que a página chama para trazer a lista
      const botao = p.locator('button, input[type=submit], a.btn').filter({ hasText: /pesquis|buscar|filtrar|consultar/i }).first()
      if (await botao.count()) {
        await botao.click({ timeout: 10_000 }).catch(() => {})
        await p.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await p.waitForTimeout(3000)
      }
    }
    const texto = await p.evaluate(() => document.body?.innerText || '')
    const links = await p.evaluate(() => [...document.querySelectorAll('a[href]')].map((a) => ({ href: (a as HTMLAnchorElement).href, texto: (a.textContent || '').trim().slice(0, 80) })))
    const pdfs = links.filter((l) => /\.pdf(\?|$)/i.test(l.href))
    const interessantes = links.filter((l) => /proposi|materia|projeto|diario|di[aá]rio|legisla|tramit|pesquis/i.test(`${l.href} ${l.texto}`)).slice(0, 40)
    return { url, status: r?.status(), titulo: await p.title(), texto: curto(texto, 1500), pdfs: pdfs.slice(0, 15), interessantes, chamadas: chamadas.slice(0, 40) }
  } catch (e) {
    return { url, erro: erro(e), chamadas: chamadas.slice(0, 20) }
  } finally {
    await ctx.close()
  }
}

/** Endereços internos que a página usa: procura caminhos /Controlador/Acao nos scripts e lista os campos do formulário. */
async function endpointsDaPagina(b: Browser, url: string) {
  const ctx = await b.newContext({ userAgent: NAVEGADOR, locale: 'pt-BR', ignoreHTTPSErrors: true })
  const p = await ctx.newPage()
  const scripts: string[] = []
  p.on('response', async (r: RespostaPw) => {
    if (r.request().resourceType() === 'script' && new URL(r.url()).host === new URL(url).host) scripts.push(await r.text().catch(() => ''))
  })
  try {
    await p.goto(url, { waitUntil: 'networkidle', timeout: 45_000 })
    const html = await p.content()
    const fontes = [html, ...scripts].join('\n')
    const caminhos = [...new Set([...fontes.matchAll(/["'`](\/(?:Legislativo|Comunicacao|Home|api)\/[A-Za-z]+[^"'`\s]{0,80})["'`]/g)].map((m) => m[1]))].slice(0, 60)
    const trechos = [...fontes.matchAll(/(?:ajax|fetch|\$\.(?:get|post|getJSON)|url\s*:)[^\n]{0,200}/gi)].map((m) => curto(m[0], 220)).slice(0, 30)
    const campos = await p.evaluate(() =>
      [...document.querySelectorAll('input, select, button, textarea')].map((e) => ({
        tag: e.tagName.toLowerCase(),
        id: e.id,
        nome: (e as HTMLInputElement).name,
        tipo: (e as HTMLInputElement).type,
        valor: ((e as HTMLInputElement).value || e.textContent || '').trim().slice(0, 40),
        opcoes: e.tagName === 'SELECT' ? [...(e as HTMLSelectElement).options].slice(0, 8).map((o) => `${o.value}=${o.text}`) : undefined,
      })),
    )
    return { url, caminhos, trechos, campos: campos.slice(0, 60) }
  } catch (e) {
    return { url, erro: erro(e) }
  } finally {
    await ctx.close()
  }
}

/** Pesquisa de proposições da Alepa: preenche o ano, clica em Pesquisar e guarda a chamada (método, corpo) e a resposta. */
async function pesquisarAlepa(b: Browser) {
  const ctx = await b.newContext({ userAgent: NAVEGADOR, locale: 'pt-BR', ignoreHTTPSErrors: true })
  const p = await ctx.newPage()
  const chamadas: { metodo: string; url: string; corpoPedido?: string; status: number; tipo: string | null; bytes: number; inicio: string; fim: string }[] = []
  p.on('response', async (r: RespostaPw) => {
    const q = r.request()
    if (!['xhr', 'fetch', 'document'].includes(q.resourceType()) || /google|DXR\.axd|\.(css|js|png|svg)(\?|$)/i.test(r.url())) return
    const corpo = await r.text().catch(() => '')
    chamadas.push({ metodo: q.method(), url: r.url(), corpoPedido: q.postData()?.slice(0, 3000), status: r.status(), tipo: r.headers()['content-type'] || null, bytes: corpo.length, inicio: corpo.slice(0, 3000), fim: corpo.slice(-1500) })
  })
  try {
    await p.goto('https://www.alepa.pa.gov.br/Home/Page/Proposicoes', { waitUntil: 'networkidle', timeout: 45_000 })
    // Campos DevExpress: o valor vai pelo próprio componente (SetValue); o clique, por DoClick
    await p.locator('#Ano_I').fill(String(new Date().getFullYear()))
    await p
      .evaluate((ano) => {
        const w = window as unknown as { ASPxClientControl?: { GetControlCollection: () => { GetByName: (n: string) => { SetValue?: (v: unknown) => void; DoClick?: () => void } | null } } }
        const col = w.ASPxClientControl?.GetControlCollection()
        col?.GetByName('Ano')?.SetValue?.(ano)
        col?.GetByName('searchButton')?.DoClick?.()
      }, String(new Date().getFullYear()))
      .catch(() => {})
    await p.waitForTimeout(5000)
    // O botão do DevExpress fica escondido atrás de um invólucro: tenta o clique forçado, o invólucro e o Enter
    await p.locator('#searchButton_I').click({ force: true, timeout: 8000 }).catch(async () => {
      await p.locator('#searchButton').click({ timeout: 8000 }).catch(async () => {
        await p.locator('#Ano_I').press('Enter')
      })
    })
    await p.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
    await p.waitForTimeout(4000)
    const cartoes = await p.evaluate(() => [...document.querySelectorAll('[id*=CardView] .dxcvCard, .dxcvCard')].slice(0, 5).map((c) => (c as HTMLElement).innerText.slice(0, 600)))
    const links = await p.evaluate(() => [...document.querySelectorAll('a[href]')].map((a) => (a as HTMLAnchorElement).href).filter((h) => /Proposic|Materia|Detalhe|\.pdf/i.test(h)).slice(0, 20))
    return { chamadas, cartoes, links, texto: curto(await p.evaluate(() => document.body?.innerText || ''), 3000) }
  } catch (e) {
    return { erro: erro(e), chamadas }
  } finally {
    await ctx.close()
  }
}

/** Baixa um PDF e conta o que interessa ao observatório: projetos de lei e termos ambientais. */
async function lerPdf(url: string) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': NAVEGADOR }, signal: AbortSignal.timeout(60_000) })
    if (!r.ok) return { url, status: r.status }
    const { texto, paginas } = await extrairTextoPdf(new Uint8Array(await r.arrayBuffer()))
    const achados = (re: RegExp) => [...texto.matchAll(re)].map((m) => curto(texto.slice(Math.max(0, m.index! - 40), m.index! + 220), 260))
    const projetos = achados(/PROJETO DE LEI/gi)
    return {
      url,
      paginas,
      caracteres: texto.length,
      projetosDeLei: projetos.length,
      exemplos: projetos.slice(0, 4),
      ambientais: achados(/ambiental|meio ambiente|florest|garimp|minera|recursos h[ií]dricos/gi).slice(0, 4),
    }
  } catch (e) {
    return { url, erro: erro(e) }
  }
}

/**
 * Estudo genérico de um estado (Fase 6+): abre os endereços conhecidos da casa e do diário (candidatos.ts) com
 * navegador, anota as chamadas por trás e os links promissores, segue até 4 deles (proposições, projetos, diário)
 * e tenta o SAPL no endereço padrão.
 */
async function estudarEstado(b: Browser, uf: string) {
  const e = ESTADOS.find((x) => x.uf === uf)
  if (!e) return { erro: 'UF desconhecida' }
  const r: Record<string, unknown> = { casa: e.casa.sigla, diario: e.diario.sigla }
  const paginas = [...e.casa.candidatos, ...e.diario.candidatos].map((c) => c.url).filter((u) => !/\/api\//.test(u))
  const seguir = new Set<string>()
  for (const url of paginas.slice(0, 4)) {
    const n = (await navegar(b, url)) as { interessantes?: { href: string; texto: string }[] }
    r[url] = n
    for (const l of n.interessantes || [])
      if (/proposi|projeto|materia|pesquis|diario|di%c3%a1rio|legisla/i.test(l.href) && new URL(l.href).host === new URL(url).host) seguir.add(l.href.split('#')[0])
  }
  // Os links mais promissores (proposições primeiro), até 4
  const ordem = [...seguir].sort((a, b) => Number(/proposi|projeto|materia/i.test(b)) - Number(/proposi|projeto|materia/i.test(a))).slice(0, 4)
  for (const url of ordem) {
    r[`seguido:${url}`] = await navegar(b, url, true)
    r[`enderecos:${url}`] = await endpointsDaPagina(b, url)
  }
  r.saplComoNavegador = await direto(`https://sapl.al.${uf.toLowerCase()}.leg.br/api/materia/materialegislativa/?page_size=1`, true)
  return r
}

async function main() {
  const b = await chromium.launch(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {})
  const resultado: Record<string, unknown> = { geradoEm: new Date().toISOString(), ambiente: process.env.GITHUB_ACTIONS ? 'GitHub Actions (fora do Brasil)' : 'local' }
  // Com UFs (ex.: BA,CE,MA): estudo genérico desses estados, gravado em alternativas-<ufs>.json
  const ufs = (process.argv[2] || '').split(',').map((u) => u.trim().toUpperCase()).filter(Boolean)
  if (ufs.length) {
    try {
      for (const uf of ufs) resultado[uf] = await estudarEstado(b, uf)
    } finally {
      await b.close()
    }
    const destino = path.resolve(process.cwd(), `levantamento/alternativas-${ufs.join('-').toLowerCase()}.json`)
    await mkdir(path.dirname(destino), { recursive: true })
    await writeFile(destino, JSON.stringify(resultado, null, 2))
    console.log(`Gravado em ${destino}`)
    return
  }
  try {
    // ---------- Pará ----------
    const pa = {
      proposicoes: await navegar(b, 'https://www.alepa.pa.gov.br/Home/Page/Proposicoes', true),
      proposicoesEnderecos: await endpointsDaPagina(b, 'https://www.alepa.pa.gov.br/Home/Page/Proposicoes'),
      pesquisa: await pesquisarAlepa(b),
      pautasEnderecos: await endpointsDaPagina(b, 'https://www.alepa.pa.gov.br/Home/Page/PautasPlenario'),
      diarioOficial: await navegar(b, 'https://www.alepa.pa.gov.br/Home/Page/DiarioOficial', true),
      diarios: await navegar(b, 'https://www.alepa.pa.gov.br/Comunicacao/Diarios'),
      bancoDeLeis: await navegar(b, 'https://bancodeleis.alepa.pa.gov.br/'),
    } as Record<string, unknown>
    const linksBanco = await (async () => {
      const ctx = await b.newContext({ userAgent: NAVEGADOR })
      const p = await ctx.newPage()
      try {
        await p.goto('https://bancodeleis.alepa.pa.gov.br/', { waitUntil: 'networkidle', timeout: 45_000 })
        return await p.evaluate(() => [...document.querySelectorAll('a[href]')].map((a) => ({ href: (a as HTMLAnchorElement).href, texto: (a.textContent || '').trim().slice(0, 60) })).filter((l) => /api|dados/i.test(`${l.href} ${l.texto}`)))
      } finally {
        await ctx.close()
      }
    })().catch((e) => [{ href: '', texto: erro(e) }])
    pa.bancoDeLeisLinksApi = linksBanco
    for (const l of linksBanco.slice(0, 2)) if (l.href) pa[`api:${l.href}`] = await navegar(b, l.href)
    const pdfPa = [pa.diarioOficial, pa.diarios].flatMap((x) => ((x as { pdfs?: { href: string }[] }).pdfs || []).map((l) => l.href))[0]
    if (pdfPa) pa.pdfDiario = await lerPdf(pdfPa)
    resultado.PA = pa

    // ---------- Roraima ----------
    const api = 'https://sapl.al.rr.leg.br/api/materia/materialegislativa/?page_size=1'
    const rr = {
      saplComoRobo: await direto(api, false),
      saplComoNavegador: await direto(api, true),
      saplNoNavegador: await navegar(b, api),
      saplPesquisa: await navegar(b, 'https://sapl.al.rr.leg.br/materia/pesquisar-materia'),
      wpMidia: await direto('https://diarios.al.rr.leg.br/wp-json/wp/v2/media?per_page=5&mime_type=application/pdf', true),
      wpPosts: await direto('https://diarios.al.rr.leg.br/wp-json/wp/v2/posts?per_page=5', true),
      diarios: await navegar(b, 'https://diarios.al.rr.leg.br/'),
    } as Record<string, unknown>
    let pdfRr: string | undefined
    try {
      const midia = JSON.parse(
        await (await fetch('https://diarios.al.rr.leg.br/wp-json/wp/v2/media?per_page=5&mime_type=application/pdf', { headers: { 'User-Agent': NAVEGADOR }, signal: AbortSignal.timeout(25_000) })).text(),
      ) as { date?: string; source_url?: string; title?: { rendered?: string } }[]
      rr.wpUltimos = midia.map((m) => ({ data: m.date, titulo: m.title?.rendered, url: m.source_url }))
      pdfRr = midia[0]?.source_url
    } catch (e) {
      rr.wpUltimos = { erro: erro(e) }
    }
    pdfRr ||= ((rr.diarios as { pdfs?: { href: string }[] }).pdfs || [])[0]?.href
    const ultimas = Array.isArray(rr.wpUltimos) ? (rr.wpUltimos as { url?: string }[]).map((m) => m.url).filter((u): u is string => !!u) : pdfRr ? [pdfRr] : []
    rr.pdfsDiario = []
    for (const u of ultimas.slice(0, 5)) (rr.pdfsDiario as unknown[]).push(await lerPdf(u))
    resultado.RR = rr

    // ---------- Amapá ----------
    resultado.AP = {
      siteComoNavegador: await direto('https://www.al.ap.leg.br/', true),
      siteNoNavegador: await navegar(b, 'https://www.al.ap.leg.br/'),
      diarioDoEstado: await navegar(b, 'https://diofe.portal.ap.gov.br/'),
    }
  } finally {
    await b.close()
  }
  const destino = path.resolve(process.cwd(), 'levantamento/alternativas.json')
  await mkdir(path.dirname(destino), { recursive: true })
  await writeFile(destino, JSON.stringify(resultado, null, 2))
  console.log(`Gravado em ${destino}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
