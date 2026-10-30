import { expect, test, type Page } from '@playwright/test'
import { login } from '../helpers/login'
import { cleanupTestUser, seedTestUser, testUser } from '../helpers/seedUser'

test.describe('Painel', () => {
  let page: Page

  test.beforeAll(async ({ browser }) => {
    await seedTestUser()
    page = await (await browser.newContext()).newPage()
    await login({ page, user: testUser })
  })

  test.afterAll(async () => {
    await cleanupTestUser()
  })

  test('menu em português com os grupos de trabalho', async () => {
    await page.goto('/admin')
    const nav = page.locator('nav').first()
    for (const t of ['Trabalho', 'Legislativo', 'Público', 'Sistema']) await expect(nav).toContainText(t)
  })

  test('listas principais abrem', async () => {
    for (const [slug, titulo] of [
      ['proposicoes', 'Proposições'],
      ['pareceres', 'Resumos prévios'],
      ['compromissos', 'Compromissos'],
      ['fontes', 'Fontes'],
    ]) {
      await page.goto(`/admin/collections/${slug}`)
      await expect(page.locator('h1').first()).toContainText(titulo)
    }
  })

  test('ajustes mostram os prazos prometidos', async () => {
    await page.goto('/admin/globals/ajustes')
    await expect(page.getByText('Prazos prometidos').first()).toBeVisible()
  })
})
