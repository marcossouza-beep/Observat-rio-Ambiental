import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { getPayload } from 'payload'
import config from '../payload.config'
import { registrarFontesEstaduais } from './fontes'
import type { Resultado } from './sondar'

const payload = await getPayload({ config: await config })
const r = JSON.parse(await readFile(path.resolve(process.cwd(), 'levantamento/resultado.json'), 'utf8')) as Resultado
const n = await registrarFontesEstaduais(payload, r)
payload.logger.info(`Fontes estaduais: ${n.criadas} criadas, ${n.atualizadas} atualizadas.`)
process.exit(0)
