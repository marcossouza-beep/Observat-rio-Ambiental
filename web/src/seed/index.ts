/**
 * Carga inicial idempotente (pode rodar mais de uma vez).
 *   pnpm seed
 * Para criar o primeiro administrador: SEED_ADMIN_EMAIL e SEED_ADMIN_SENHA no ambiente.
 */
import { getPayload } from 'payload'
import config from '../payload.config'
import { BIOMAS, FONTES, PALAVRAS, PALAVRAS_NE, PALAVRAS_NORTE, TEMAS } from './dados'

async function upsert(payload: Awaited<ReturnType<typeof getPayload>>, collection: string, campo: string, valor: string, data: Record<string, unknown>) {
  const achado = await payload.find({ collection: collection as never, where: { [campo]: { equals: valor } }, limit: 1, depth: 0 })
  if (achado.docs[0]) return { criado: false }
  await payload.create({ collection: collection as never, data: data as never })
  return { criado: true }
}

export async function seed() {
  const payload = await getPayload({ config: await config })
  let n = 0
  for (const nome of TEMAS) n += (await upsert(payload, 'temas', 'nome', nome, { nome })).criado ? 1 : 0
  for (const [nome, ufs] of BIOMAS) n += (await upsert(payload, 'biomas', 'nome', nome, { nome, ufs })).criado ? 1 : 0
  for (const f of FONTES) n += (await upsert(payload, 'fontes', 'slug', f.slug, { ...f })).criado ? 1 : 0
  for (const [termo, grupo, peso, exclusao] of PALAVRAS)
    n += (await upsert(payload, 'palavras-chave', 'termo', termo, { termo, grupo, peso, exclusao: !!exclusao })).criado ? 1 : 0
  // Grupos genéricos das versões anteriores passam para a área ou o bioma (só esses; o resto é do autor)
  for (const [termo, grupo] of [...PALAVRAS, ...PALAVRAS_NORTE]) {
    const r = await payload.update({ collection: 'palavras-chave', where: { and: [{ termo: { equals: termo } }, { grupo: { in: ['Bioma', 'Órgão ambiental'] } }] }, data: { grupo } })
    n += r.docs.length
  }
  for (const [termo, grupo, peso, uf] of [...PALAVRAS_NORTE, ...PALAVRAS_NE]) n += (await upsert(payload, 'palavras-chave', 'termo', termo, { termo, grupo, peso, uf })).criado ? 1 : 0

  const email = process.env.SEED_ADMIN_EMAIL
  const password = process.env.SEED_ADMIN_SENHA
  if (email && password) {
    n += (await upsert(payload, 'users', 'email', email, { email, password, papel: 'admin', nome: 'Administrador' })).criado ? 1 : 0
  }
  payload.logger.info(`Carga inicial concluída: ${n} registros novos.`)
}

await seed()
process.exit(0)
