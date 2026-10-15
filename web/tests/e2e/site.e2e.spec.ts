/**
 * Site público com o conteúdo de demonstração (pnpm seed:demo).
 */
import { expect, test } from '@playwright/test'
import { getPayload } from 'payload'
import config from '../../src/payload.config.js'

const LIC = '/leis/pl-1234-2026-licenciamento-simplificado-para-fazendas-de-medio-porte'
const PANT = '/leis/pl-140-2026-regras-de-protecao-do-pantanal'
const DRONES = '/leis/pl-3010-2026-uso-de-agrotoxicos-por-drones'
const PARECER = '/pareceres/pl-1234-2026-licenciamento-simplificado-para-fazendas-de-medio-porte'

const jsonLd = async (page: import('@playwright/test').Page) =>
  (await page.locator('script[type="application/ld+json"]').allTextContents()).map((t) => JSON.parse(t))

test.describe('Site público', () => {
  test('início: agenda, explore e mais recentes', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Em votação esta semana' })).toBeVisible()
    await expect(page.locator('.tcard')).toHaveCount(4)
    await expect(page.locator('.law').first()).toBeVisible()
  })

  test('lei com parecer', async ({ page }) => {
    await page.goto(LIC)
    await expect(page).toHaveTitle(/texto, tramitação e votação/)
    await expect(page.getByRole('link', { name: /Ler o parecer completo/ })).toBeVisible()
    const ld = await jsonLd(page)
    expect(ld.some((j) => j['@type'] === 'Legislation')).toBe(true)
    expect(ld.some((j) => j['@type'] === 'BreadcrumbList')).toBe(true)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`${LIC}$`))
  })

  test('lei com parecer prometido mostra o aviso e o que já se sabe', async ({ page }) => {
    await page.goto(PANT)
    await expect(page).toHaveTitle(/parecer em breve/)
    await expect(page.getByRole('heading', { name: 'Parecer em preparação' })).toBeVisible()
    await expect(page.getByText('O que já se sabe')).toBeVisible()
  })

  test('lei só acompanhada não promete parecer', async ({ page }) => {
    await page.goto(DRONES)
    await expect(page).not.toHaveTitle(/parecer em breve/)
    await expect(page.getByRole('heading', { name: 'Acompanhando' })).toBeVisible()
    await expect(page.getByText('Parecer em preparação')).toHaveCount(0)
  })

  test('parecer: assinatura no topo, 7 seções e dados estruturados', async ({ page }) => {
    await page.goto(PARECER)
    await expect(page.locator('.byline')).toContainText('Nome do Autor')
    for (const s of ['Resumo', 'O que muda', 'Impactos por dimensão', 'Pontos de atenção', 'Base legal', 'Recomendações', 'Conclusão'])
      await expect(page.getByRole('heading', { name: s, exact: true })).toBeVisible()
    const art = (await jsonLd(page)).find((j) => j['@type'] === 'Article')
    expect(art.author.name).toBe('Nome do Autor')
    expect(art.about['@type']).toBe('Legislation')
    await page.locator('.byline a', { hasText: 'Nome do Autor' }).click()
    await expect(page).toHaveURL(/\/autores\/nome-do-autor$/)
    await expect(page.locator('.law')).toHaveCount(4)
  })

  test('proposição na triagem não aparece no site', async ({ page }) => {
    const payload = await getPayload({ config })
    const slug = 'pl-9999-2026-teste-triagem'
    await payload.delete({ collection: 'proposicoes', where: { slug: { equals: slug } } })
    await payload.create({ collection: 'proposicoes', data: { sigla: 'PL', numero: 9999, ano: 2026, esfera: 'federal', slug, situacaoEditorial: 'triagem' } as never })
    const r = await page.goto(`/leis/${slug}`)
    expect(r?.status()).toBe(404)
    await payload.delete({ collection: 'proposicoes', where: { slug: { equals: slug } } })
  })

  test('busca, listas e páginas de tema', async ({ page }) => {
    await page.goto('/busca?q=garimpo')
    await expect(page.locator('.law')).toHaveCount(1)
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
    await page.goto('/leis?esfera=estadual')
    await expect(page.locator('.law').first()).toBeVisible()
    await page.goto('/biomas/pantanal')
    await expect(page.locator('h1')).toContainText('Pantanal')
    await page.goto('/pareceres')
    await expect(page.locator('.law')).toHaveCount(4)
    await page.goto('/artigos')
    await expect(page.locator('.law').first()).toBeVisible()
  })

  test('sitemap, robots e página inexistente', async ({ page, request }) => {
    const sm = await (await request.get('/sitemap.xml')).text()
    expect(sm).toContain(LIC)
    expect(sm).toContain(PARECER)
    const rb = await (await request.get('/robots.txt')).text()
    expect(rb).toMatch(/Disallow: \/admin/)
    const r = await page.goto('/leis/nao-existe')
    expect(r?.status()).toBe(404)
  })

  test('celular sem rolagem lateral', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const page = await ctx.newPage()
    for (const c of ['/', PANT, PARECER]) {
      await page.goto(c)
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
    }
    await ctx.close()
  })

  test('parlamentares: lista, página com votos e método, link a partir da lei', async ({ page }) => {
    await page.goto('/parlamentares')
    await expect(page.getByRole('heading', { name: 'Parlamentares', level: 1 })).toBeVisible()
    await page.getByRole('link', { name: /Dep\. Exemplo F/ }).click()
    await expect(page.getByRole('heading', { name: 'Dep. Exemplo F', level: 1 })).toBeVisible()
    await expect(page.locator('#votos')).toContainText('votou no sentido da proteção')
    await expect(page.locator('#votos')).toContainText('Licenciamento simplificado')
    await expect(page.locator('#metodo')).toContainText('não avalia a pessoa')
    await page.goto('/leis/pl-1234-2026-licenciamento-simplificado-para-fazendas-de-medio-porte')
    await expect(page.locator('#quem').getByRole('link', { name: 'Dep. Exemplo F' })).toHaveAttribute('href', '/parlamentares/dep-exemplo-f-partido-go')
  })
})
