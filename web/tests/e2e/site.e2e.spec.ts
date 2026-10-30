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

  test('Panorama: casas e estados, só aprovadas, biomas, áreas e método', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.pano-chamada')).toContainText('4 pareceres')
    await page.locator('.pano-chamada').click()
    await expect(page).toHaveURL(/\/panorama$/)
    await expect(page.locator('h1')).toHaveText('Panorama')
    const linha = (nome: string) => page.locator('.ranking-linha', { hasText: nome })
    await expect(linha('União')).toContainText('2 pareceres')
    await expect(linha('Câmara dos Deputados')).toContainText('1 parecer')
    await expect(linha('Senado Federal')).toContainText('0 pareceres')
    await expect(linha('Presidência da República')).toContainText('1 parecer')
    await expect(linha('Pará')).toContainText('1 parecer')
    await expect(linha('Amazonas')).toContainText('0 pareceres · 1 proposta acompanhada')
    // Amostra pequena: nenhum grupo da demonstração tem 5 pareceres
    await expect(linha('União')).toContainText('Amostra pequena')
    await expect(linha('Pará').getByRole('img')).toHaveAttribute('aria-label', 'Benéfico 100%')
    await page.getByRole('link', { name: 'Só aprovadas' }).click()
    await expect(page).toHaveURL(/so=aprovadas/)
    await expect(linha('União')).toContainText('1 parecer')
    await expect(linha('Pará')).toContainText('0 pareceres')
    await page.locator('.como-tabela').first().locator('summary').click()
    await expect(page.locator('.como-tabela table').first()).toContainText('Presidência da República')

    await page.getByRole('link', { name: 'Biomas', exact: true }).click()
    await expect(page.locator('.pano-card', { hasText: 'Cerrado' })).toContainText('2 pareceres')
    await expect(page.locator('.pano-card', { hasText: 'Cerrado' })).toContainText('100% de alto impacto')
    await page.getByRole('link', { name: 'Áreas', exact: true }).click()
    await expect(page.locator('.area-linha', { hasText: 'Licenciamento' }).locator('.qtd b')).toHaveText('1')
    await expect(page.locator('#metodo')).toContainText('Amostra mínima')
    await expect(page.locator('#metodo')).toContainText('Enfraquece indiretamente')
  })

  test('Leis federais: padrão de atuação acompanha o filtro de casa; estado tem o seu', async ({ page }) => {
    await page.goto('/leis?esfera=federal')
    await expect(page.locator('.padrao h2')).toHaveText('Padrão de atuação · União')
    await expect(page.locator('.padrao')).toContainText('2 pareceres')
    await page.getByRole('link', { name: 'Câmara', exact: true }).click()
    await expect(page).toHaveURL(/casa=camara/)
    await expect(page.locator('h1')).toHaveText('Leis ambientais federais: Câmara dos Deputados')
    await expect(page.locator('.padrao h2')).toHaveText('Padrão de atuação · Câmara dos Deputados')
    await expect(page.locator('.padrao .padrao-linhas').getByRole('img').first()).toHaveAttribute('aria-label', 'Maléfico 100%')
    // Só as que começaram na Câmara (o teste do painel pode tornar pública mais uma da triagem)
    await expect(page.locator('.list')).toContainText('Licenciamento simplificado')
    await expect(page.locator('.list')).not.toContainText('Regras de proteção do Pantanal')
    await page.goto('/leis?uf=TO')
    await expect(page.locator('.padrao h2')).toHaveText('Padrão de atuação · Tocantins')
    await expect(page.locator('.padrao')).toContainText('Só o que foi aprovado')
    await page.goto('/biomas/cerrado')
    await expect(page.locator('.numeros')).toContainText('2pareceres')
    await page.goto('/temas')
    await expect(page.locator('.tb-card', { hasText: 'Cerrado' })).toContainText('2 pareceres')
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

  test('parecer: assinatura no topo, 7 seções do modelo do site e dados estruturados', async ({ page }) => {
    await page.goto(PARECER)
    await expect(page.locator('.byline')).toContainText('Nome do Autor')
    for (const s of ['Em uma frase', 'O que é', 'Como é hoje × como fica', 'Classificação', 'Por que importa', 'Pontos de atenção', 'Próximos passos'])
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

  test('leis estaduais: mapa, painel do estado e cobertura', async ({ page }) => {
    await page.goto('/estaduais?uf=PA')
    await expect(page.locator('h1')).toHaveText('Leis estaduais')
    await expect(page.locator('.uf-title h2')).toHaveText('Pará')
    await expect(page.locator('.ufpanel .sub-h')).toHaveText('Norte')
    await expect(page.locator('.minilaw').first()).toBeVisible()
    await expect(page.locator('.cov .tag')).toHaveText('Monitoramento manual')
    await page.locator('.tilemap a[title="São Paulo"]').click()
    await expect(page).toHaveURL(/uf=SP/)
    await expect(page.locator('.cov .tag')).toHaveText('Em breve')
    await expect(page.locator('.ask .pill-btn')).toHaveText('Avise-me')
    await page.goto('/estaduais?regiao=Norte')
    await expect(page.locator('.chip[aria-current="true"]')).toHaveText('Norte')
  })

  test('sitemap, robots e página inexistente', async ({ page, request }) => {
    const sm = await (await request.get('/sitemap.xml')).text()
    expect(sm).toContain(LIC)
    expect(sm).toContain(PARECER)
    expect(sm).toContain('/panorama')
    const rb = await (await request.get('/robots.txt')).text()
    expect(rb).toMatch(/Disallow: \/admin/)
    const r = await page.goto('/leis/nao-existe')
    expect(r?.status()).toBe(404)
  })

  test('celular sem rolagem lateral', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const page = await ctx.newPage()
    for (const c of ['/', PANT, PARECER, '/panorama', '/panorama?aba=areas', '/leis?esfera=federal']) {
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
