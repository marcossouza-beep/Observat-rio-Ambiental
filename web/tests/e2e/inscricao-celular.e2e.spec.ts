import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

test.describe('Inscrição no celular', () => {
  test('cabe na tela, mantém o botão à vista e não dá zoom nos campos', async ({ page }) => {
    await page.goto('/inscricao')
    const largura = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(largura).toBeLessThanOrEqual(390)

    const continuar = page.getByRole('button', { name: 'Continuar' })
    await expect(continuar).toBeInViewport()
    const caixa = await continuar.boundingBox()
    expect(caixa!.height).toBeGreaterThanOrEqual(48)

    const fonte = await page.getByLabel('E-mail').evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
    expect(fonte).toBeGreaterThanOrEqual(16)

    await expect(page.getByText('Passo 1 de 4')).toBeVisible()
    await page.getByLabel('Nome').fill('Teste Celular')
    await page.getByLabel('E-mail').fill('teste@gmial.com')
    await page.getByLabel('Nome').click()
    await page.getByRole('button', { name: /Você quis dizer/ }).click()
    await expect(page.getByLabel('E-mail')).toHaveValue('teste@gmail.com')

    await continuar.click()
    await expect(page.getByText('Passo 2 de 4')).toBeVisible()
    await page.getByRole('radio', { name: /Estudante/ }).click()
    await expect(page.getByRole('button', { name: 'Trocar' })).toBeVisible()
    await page.getByLabel('Curso').fill('Direito')
    await page.getByLabel('Estado onde você mora').selectOption('TO')
    await expect(page.locator('.uf-sel img[src="/bandeiras/to.svg"]')).toBeVisible()

    // A barra de ações continua à vista depois de rolar a página.
    await page.mouse.wheel(0, 600)
    await expect(continuar).toBeInViewport()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)

    await page.getByRole('button', { name: 'Trocar' }).click()
    await page.getByRole('radio', { name: /Jornalista/ }).click()
    await expect(page.getByText('Passo 2 de 5')).toBeVisible()
    await page.getByRole('button', { name: 'Voltar' }).click()
    await expect(page.getByLabel('E-mail')).toHaveValue('teste@gmail.com')
  })
})
