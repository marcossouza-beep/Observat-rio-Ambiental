/**
 * Telas de trabalho do painel (Sprint 3), com o conteúdo de demonstração.
 */
import { expect, test, type Page } from '@playwright/test'
import { getPayload, type Payload } from 'payload'
import config from '../../src/payload.config.js'
import { login } from '../helpers/login'
import { cleanupTestUser, seedTestUser } from '../helpers/seedUser'

const autor = { email: 'autor-e2e@observatorio.local', password: 'senha-de-teste', papel: 'admin' as const }

let payload: Payload
let page: Page
const TILAPIA = 'demo:t2'

async function voltarParaTriagem() {
  const r = await payload.find({ collection: 'proposicoes', where: { chaveOrigem: { equals: TILAPIA } }, limit: 1 })
  const p = r.docs[0]
  await payload.delete({ collection: 'compromissos', where: { proposicao: { equals: p.id } } })
  await payload.update({ collection: 'proposicoes', id: p.id, data: { situacaoEditorial: 'triagem', prazoParecer: null, temas: [], biomas: [] } })
  return p
}

test.describe.configure({ mode: 'serial' })

test.describe('Painel do autor', () => {
  test.beforeAll(async ({ browser }) => {
    payload = await getPayload({ config })
    await seedTestUser(autor)
    await voltarParaTriagem()
    page = await (await browser.newContext()).newPage()
    await login({ page, user: autor })
  })

  test.afterAll(async () => {
    await voltarParaTriagem()
    const pant = await payload.find({ collection: 'proposicoes', where: { chaveOrigem: { equals: 'demo:pant' } }, limit: 1 })
    await payload.delete({ collection: 'pareceres', where: { proposicao: { equals: pant.docs[0].id } } })
    await cleanupTestUser(autor)
  })

  test('Hoje mostra o que precisa do autor', async () => {
    await page.goto('/admin')
    await expect(page.getByRole('heading', { name: 'Precisa de você' })).toBeVisible()
    await expect(page.locator('.obs-hoje')).toContainText('Atualização do parecer')
    await expect(page.locator('.obs-hoje')).toContainText('Votações dos próximos 7 dias')
    await expect(page.locator('.obs-nav')).toContainText('Triagem')
  })

  test('Radar: novidades da coleta e marcar como visto', async () => {
    const p = (await payload.find({ collection: 'proposicoes', where: { chaveOrigem: { equals: TILAPIA } }, limit: 1 })).docs[0]
    await payload.delete({ collection: 'alertas', where: { chave: { like: 'e2e:' } } })
    await payload.create({ collection: 'alertas', data: { proposicao: p.id, tipo: 'pauta', titulo: 'Na pauta da CMADS (Reunião Deliberativa)', data: new Date().toISOString(), chave: 'e2e:radar' } })
    await page.goto('/admin/radar')
    await expect(page.getByRole('heading', { name: 'Radar' })).toBeVisible()
    await expect(page.locator('.obs-linhas')).toContainText('Na pauta da CMADS')
    await expect(page.locator('.obs-nav')).toContainText('Radar')
    await page.getByRole('button', { name: 'Marcar tudo como visto' }).click()
    await expect(page.locator('.obs-faixa')).toContainText('Nada novo')
    await payload.delete({ collection: 'alertas', where: { chave: { like: 'e2e:' } } })
  })

  test('Triagem: ativar com prazo publica o aviso e cria o compromisso', async () => {
    await page.goto('/admin/triagem')
    const linha = page.locator('.obs-tri', { hasText: 'tilápia' })
    await expect(linha.locator('mark').first()).toBeVisible()
    // Área sugerida pelos termos (tilápia, espécies exóticas) vem marcada; a desmarcada não é gravada
    await expect(linha.getByRole('button', { name: /Espécies exóticas/ })).toHaveAttribute('aria-pressed', 'true')
    const agua = linha.getByRole('button', { name: /Água/ })
    if (await agua.count()) {
      await agua.click()
      await expect(agua).toHaveAttribute('aria-pressed', 'false')
    }
    await linha.getByRole('button', { name: 'Ativar parecer' }).click()
    await linha.locator('input[type="date"]').fill('2026-12-01')
    await linha.getByRole('button', { name: 'Ativar e publicar aviso' }).click()
    await expect(page.locator('.obs-tri', { hasText: 'tilápia' })).toHaveCount(0)

    const p = (await payload.find({ collection: 'proposicoes', where: { chaveOrigem: { equals: TILAPIA } }, limit: 1 })).docs[0]
    expect(p.situacaoEditorial).toBe('ativa')
    const nomes = (p.temas || []).map((t) => (typeof t === 'object' ? t.nome : t))
    expect(nomes).toContain('Espécies exóticas')
    expect(nomes).not.toContain('Água')
    const c = await payload.find({ collection: 'compromissos', where: { proposicao: { equals: p.id }, status: { equals: 'aberto' } } })
    expect(c.docs[0].prazoEm.slice(0, 10)).toBe('2026-12-01')

    const pub = await page.request.get(`/leis/${p.slug}`)
    expect(await pub.text()).toContain('Parecer em preparação')
  })

  test('Triagem: descartar pede motivo', async () => {
    await page.goto('/admin/triagem')
    const linha = page.locator('.obs-tri', { hasText: 'Dia Nacional do Ipê' })
    await expect(linha.locator('.obs-nota-rel')).toHaveText('0')
    await linha.getByRole('button', { name: 'Descartar' }).click()
    await linha.locator('select').selectOption('Homenagem ou data')
    await linha.getByRole('button', { name: 'Descartar' }).click()
    await expect(page.locator('.obs-tri', { hasText: 'Dia Nacional do Ipê' })).toHaveCount(0)
    const p = (await payload.find({ collection: 'proposicoes', where: { chaveOrigem: { equals: 'demo:t3' } }, limit: 1 })).docs[0]
    expect(p.motivoDescarte).toBe('Homenagem ou data')
    await payload.update({ collection: 'proposicoes', id: p.id, data: { situacaoEditorial: 'triagem', motivoDescarte: null } })
  })

  test('Fila: a atualizar e começar parecer prometido', async () => {
    await page.goto('/admin/fila?aba=atualizar')
    await expect(page.locator('.obs-linha')).toContainText('PL nº 1.234/2026')
    await page.goto('/admin/fila?aba=prometidos')
    const linha = page.locator('.obs-linha', { hasText: 'PL nº 140/2026' })
    await linha.getByRole('button', { name: 'Começar parecer' }).click()
    await expect(page).toHaveURL(/\/admin\/collections\/pareceres\/\d+/)
    await expect(page.locator('.obs-checagem:not(.obs-rastro)')).toContainText('0 de 7 seções escritas')
    await expect(page.locator('.obs-aviso')).toContainText('Parecer prometido ao público')
  })

  test('Editor: dossiê com o que mudou entre as versões', async () => {
    const lic = (await payload.find({ collection: 'proposicoes', where: { chaveOrigem: { equals: 'demo:lic' } }, limit: 1 })).docs[0]
    const par = (await payload.find({ collection: 'pareceres', where: { proposicao: { equals: lic.id } }, limit: 1 })).docs[0]
    await page.goto(`/admin/collections/pareceres/${par.id}`)
    await expect(page.locator('.obs-aviso.r')).toContainText('O texto mudou')
    await expect(page.locator('.obs-dossie ins').first()).toBeVisible()
    await expect(page.locator('.obs-dossie del').first()).toBeVisible()
    await expect(page.locator('.obs-checagem:not(.obs-rastro)')).toContainText('7 de 7 seções escritas')
  })
})
