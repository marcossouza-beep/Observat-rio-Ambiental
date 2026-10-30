/**
 * Inscrição sem senha, conta, Avise-me, download para inscritos, correção, descadastro e exclusão (Sprint 4).
 * Os e-mails saem no console nos testes; o link é lido do registro de envios.
 */
import { expect, test, type Page } from '@playwright/test'
import { PDFDocument } from 'pdf-lib'
import { getPayload, type Payload } from 'payload'
import { extractText, getDocumentProxy } from 'unpdf'
import config from '../../src/payload.config.js'

const EMAIL = 'inscrita-e2e@exemplo.com'
const PANT = '/leis/pl-140-2026-regras-de-protecao-do-pantanal'
const RESEX_PARECER = '/pareceres/pa-pl-123-2026-nova-reserva-extrativista-no-baixo-rio-exemplo'
let payload: Payload
let page: Page

async function ultimoLink(email: string) {
  const r = await payload.find({ collection: 'envios', where: { para: { equals: email }, tipo: { equals: 'acesso' } }, sort: '-createdAt', limit: 1 })
  const m = r.docs[0]?.html?.match(/href="([^"]*\/api\/entrar\/confirmar[^"]*)"/)
  return m ? m[1].replace(/&amp;/g, '&').replace(/^https?:\/\/[^/]+/, '') : null
}

async function limpar() {
  const a = await payload.find({ collection: 'assinantes', where: { email: { equals: EMAIL } } })
  for (const x of a.docs) {
    await payload.delete({ collection: 'envios', where: { assinante: { equals: x.id } } })
    await payload.delete({ collection: 'assinantes', id: x.id })
  }
  await payload.delete({ collection: 'envios', where: { para: { equals: EMAIL } } })
}

test.describe.configure({ mode: 'serial' })

test.describe('Conta do inscrito', () => {
  test.beforeAll(async ({ browser }) => {
    payload = await getPayload({ config })
    await limpar()
    page = await (await browser.newContext()).newPage()
  })
  test.afterAll(async () => {
    await limpar()
  })

  test('inscrição em passos, link no e-mail e conta confirmada', async () => {
    await page.goto('/inscricao')
    await page.getByLabel('Nome').fill('Maria Teste')
    await page.getByLabel('E-mail').fill(EMAIL)
    await page.getByRole('button', { name: 'Continuar' }).click()
    await page.getByRole('radio', { name: /Servidor\(a\) público\(a\)/ }).click()
    await page.getByRole('button', { name: 'Continuar' }).click()
    await expect(page.getByText(/Em que órgão: escolha uma opção/)).toBeVisible()
    await page.getByRole('button', { name: 'Ministério Público' }).click()
    await page.getByRole('button', { name: 'Continuar' }).click()
    await page.getByRole('button', { name: 'Pantanal' }).click()
    await page.getByRole('button', { name: 'Continuar' }).click()
    await page.getByRole('button', { name: 'Concluir inscrição' }).click()
    await expect(page.getByText('Marque a concordância')).toBeVisible()
    await page.getByLabel(/Li e concordo/).check()
    await page.getByRole('button', { name: 'Concluir inscrição' }).click()
    await expect(page.getByRole('heading', { name: 'Confira seu e-mail' })).toBeVisible()

    const a = (await payload.find({ collection: 'assinantes', where: { email: { equals: EMAIL } } })).docs[0]
    expect(a.subperfil).toBe('Ministério Público')
    expect(a.confirmadoEm).toBeFalsy()
    // Alerta diário e resumo semanal: opções visíveis e marcadas na inscrição
    expect([a.alertas, a.resumoSemanal]).toEqual([true, true])

    const link = await ultimoLink(EMAIL)
    expect(link).toBeTruthy()
    await page.goto(link!)
    await expect(page).toHaveURL(/\/conta\?bemvindo=1/)
    await expect(page.getByText('Sua inscrição está confirmada')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Maria Teste' })).toBeVisible()
    expect((await payload.findByID({ collection: 'assinantes', id: a.id })).confirmadoEm).toBeTruthy()

    // link de uso único
    await page.goto(link!)
    await expect(page).toHaveURL(/\/entrar\?erro=link/)
  })

  test('Avise-me e seguir a lei, logada', async () => {
    await page.goto(PANT)
    await page.getByRole('button', { name: 'Avise-me quando o parecer sair' }).click()
    await expect(page.getByRole('button', { name: '✓ Você será avisado' })).toBeVisible()
    await page.getByRole('button', { name: 'Seguir esta lei' }).click()
    await expect(page.getByRole('button', { name: '✓ Seguindo esta lei' })).toBeVisible()
    await page.goto('/conta')
    await expect(page.getByText('PL nº 140/2026').first()).toBeVisible()
  })

  test('seguir parlamentar; escolher e-mails e interesses na conta', async () => {
    await page.goto('/parlamentares/dep-exemplo-f-partido-go')
    await expect(page.getByRole('heading', { name: 'Como votou' })).toBeVisible()
    await page.getByRole('button', { name: 'Seguir', exact: true }).click()
    await expect(page.getByRole('button', { name: '✓ Seguindo' })).toBeVisible()

    await page.goto('/conta')
    await expect(page.locator('section').filter({ has: page.getByRole('heading', { name: 'Parlamentares que você segue' }) })).toContainText('Dep. Exemplo F')
    await page.getByLabel(/Resumo semanal/).uncheck()
    await page.locator('section').filter({ has: page.getByRole('heading', { name: 'Seus interesses' }) }).getByRole('button', { name: 'Licenciamento', exact: true }).click()
    await expect(page.locator('section').filter({ has: page.getByRole('heading', { name: 'Seus interesses' }) }).getByRole('button', { name: 'Licenciamento', exact: true })).toHaveAttribute('aria-pressed', 'true')
    // A tela salva em segundo plano: espera o banco refletir as escolhas
    const conta = async () => (await payload.find({ collection: 'assinantes', where: { email: { equals: EMAIL } }, depth: 0 })).docs[0]
    await expect
      .poll(async () => {
        const a = await conta()
        return { resumoSemanal: a.resumoSemanal, alertas: a.alertas, temas: (a.temas || []).length, parlamentares: (a.seguirParlamentares || []).length }
      })
      .toEqual({ resumoSemanal: false, alertas: true, temas: 1, parlamentares: 1 })
  })

  test('download de material: só para inscritos confirmados, carimbado com o link rastreável', async ({ browser }) => {
    const resex = (await payload.find({ collection: 'proposicoes', where: { chaveOrigem: { equals: 'demo:resex' } } })).docs[0]
    const par = (await payload.find({ collection: 'pareceres', where: { proposicao: { equals: resex.id } } })).docs[0]
    const origem = await PDFDocument.create()
    origem.addPage([595, 842])
    const pdf = Buffer.from(await origem.save())
    const m = await payload.create({ collection: 'materiais', data: { titulo: 'Nota técnica de teste', tipo: 'nota_tecnica' }, file: { data: pdf, mimetype: 'application/pdf', name: 'nota-teste-e2e.pdf', size: pdf.length } })
    await payload.update({ collection: 'pareceres', id: par.id, data: { materiais: { notaTecnica: m.id } } })

    const anon = await (await browser.newContext()).newPage()
    const r1 = await anon.request.get(`/api/baixar/${m.id}`, { maxRedirects: 0 })
    expect(r1.status()).toBe(303)
    expect(r1.headers().location).toMatch(/^\/entrar/)

    const r2 = await page.request.get(`/api/baixar/${m.id}`)
    expect(r2.status()).toBe(200)
    expect(r2.headers()['content-type']).toContain('application/pdf')

    // Cada página sai com a identificação do parecer e o link de volta ao site
    const { text } = await extractText(await getDocumentProxy(new Uint8Array(await r2.body())), { mergePages: true })
    const link = `/r/${par.id}-nt-v${par.versao ?? 1}`
    expect(text).toContain('Nota técnica do parecer prévio sobre PL nº 123/2026')
    expect(text).toContain(link)

    // O link registra o acesso (sem dado pessoal) e leva ao parecer, avisando de qual PDF o leitor veio
    const antes = (await payload.count({ collection: 'acessos-pdf', where: { parecer: { equals: par.id } } })).totalDocs
    const r3 = await anon.request.get(link, { maxRedirects: 0 })
    expect(r3.status()).toBe(302)
    expect(r3.headers().location).toContain(`/pareceres/${par.slug}?pdf=nt&v=${par.versao ?? 1}`)
    expect((await payload.count({ collection: 'acessos-pdf', where: { parecer: { equals: par.id } } })).totalDocs).toBe(antes + 1)
    await anon.goto(link)
    await expect(anon.getByText('Você chegou pelo link da nota técnica.')).toBeVisible()
    expect((await anon.request.get('/r/qualquer-coisa', { maxRedirects: 0 })).headers().location).toMatch(/\/pareceres$/)
    await payload.delete({ collection: 'acessos-pdf', where: { parecer: { equals: par.id } } })

    await payload.update({ collection: 'pareceres', id: par.id, data: { materiais: { notaTecnica: null } } })
    await payload.delete({ collection: 'materiais', id: m.id })
  })

  test('pedido de correção pelo parecer abre prazo no painel', async () => {
    await page.goto(RESEX_PARECER)
    await page.getByRole('button', { name: 'Encontrou um erro? Avise.' }).click()
    await page.getByLabel('O que está errado?').fill('A área da reserva é de 48 mil hectares, confira o anexo.')
    await page.getByLabel('Seu e-mail, para a resposta').fill(EMAIL)
    await page.getByRole('button', { name: 'Enviar' }).click()
    await expect(page.getByText(/Respondemos por e-mail em até 3 dias úteis/)).toBeVisible()
    const ped = (await payload.find({ collection: 'pedidos', where: { email: { equals: EMAIL } }, sort: '-createdAt', limit: 1 })).docs[0]
    const c = await payload.find({ collection: 'compromissos', where: { alvo: { equals: 'pedidos' }, alvoId: { equals: String(ped.id) } } })
    expect(c.docs[0].tipo).toBe('correcao')
    await payload.delete({ collection: 'compromissos', where: { alvoId: { equals: String(ped.id) }, alvo: { equals: 'pedidos' } } })
    await payload.delete({ collection: 'pedidos', id: ped.id })
  })

  test('descadastro em um clique', async () => {
    const env = (await payload.find({ collection: 'envios', where: { para: { equals: EMAIL } }, limit: 1 })).docs[0]
    const a = (await payload.find({ collection: 'assinantes', where: { email: { equals: EMAIL } } })).docs[0]
    const { linkDescadastro } = await import('../../src/lib/email')
    const url = linkDescadastro(a.id).replace(/^https?:\/\/[^/]+/, '')
    expect(env).toBeTruthy()
    await page.goto(url)
    await expect(page.getByRole('heading', { name: /não recebe mais e-mails/ })).toBeVisible()
    const depois = await payload.findByID({ collection: 'assinantes', id: a.id })
    expect(depois.aceitaEmails).toBe(false)
  })

  test('excluir a inscrição apaga os dados', async () => {
    await page.goto('/conta')
    await page.getByRole('button', { name: 'Excluir minha inscrição' }).click()
    await page.getByRole('button', { name: 'Excluir de vez' }).click()
    await expect(page).toHaveURL(/\?excluido=1/)
    const r = await payload.find({ collection: 'assinantes', where: { email: { equals: EMAIL } } })
    expect(r.totalDocs).toBe(0)
    const s = await (await page.request.get('/api/sessao')).json()
    expect(s.logado).toBe(false)
  })
})
