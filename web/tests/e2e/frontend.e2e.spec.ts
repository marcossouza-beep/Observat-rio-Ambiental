import { expect, test } from '@playwright/test'

test.describe('Site público', () => {
  test('página inicial', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Observatório Ambiental/)
    await expect(page.locator('h1')).toContainText('ambientais')
  })

  test('saúde responde sem dados pessoais', async ({ request }) => {
    const r = await request.get('/api/saude')
    expect(r.status()).toBe(200)
    const corpo = await r.json()
    expect(corpo.ok).toBe(true)
    expect(Array.isArray(corpo.fontes)).toBe(true)
    expect(JSON.stringify(corpo)).not.toMatch(/@/)
  })

  test('tarefas agendadas exigem o segredo', async ({ request }) => {
    expect((await request.post('/api/cron/verificacao')).status()).toBe(401)
    const ok = await request.post('/api/cron/verificacao', { headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` } })
    expect(ok.status()).toBe(200)
    expect((await ok.json()).ok).toBe(true)
  })

  test('visitante não lê inscritos nem compromissos', async ({ request }) => {
    for (const c of ['assinantes', 'compromissos', 'pedidos']) {
      const r = await request.get(`/api/${c}`)
      expect([401, 403]).toContain(r.status())
    }
  })
})
