/**
 * Roda a coleta das fontes e grava no banco.
 * Uso: pnpm coleta                  (Câmara, Senado, Congresso, Diário Oficial e as Assembleias com SAPL)
 *      COLETA_FONTES=senado,dou pnpm coleta
 * No GitHub Actions: .github/workflows/coleta.yml (6h, 12h, 18h e 23h em Brasília).
 * Sai com erro se alguma fonte falhar (o alerta aparece também no painel, em Hoje).
 */
import { writeFile } from 'node:fs/promises'
import { getPayload } from 'payload'
import config from '../payload.config'
import { CONECTORES, coletar } from './executar'

const fontes = (process.env.COLETA_FONTES || Object.keys(CONECTORES).join(','))
  .split(',')
  .map((f) => f.trim())
  .filter(Boolean)

const payload = await getPayload({ config: await config })
const { resultados, textos } = await coletar(payload, fontes)
const linhas = ['# Coleta', '', `Rodada em ${new Date().toISOString()}`, '']
for (const r of resultados) {
  linhas.push(`## ${r.ok ? '✅' : '❌'} ${r.fonte}`, '')
  if (r.ignorada) linhas.push(`- ignorada: ${r.ignorada}`)
  if (r.erro) linhas.push(`- erro: ${r.erro}`)
  if (r.itens != null) linhas.push(`- itens listados: ${r.itens}`)
  if (r.balanco) linhas.push(`- ${Object.entries(r.balanco).map(([k, v]) => `${k}: ${v}`).join(' · ')}`)
  for (const a of r.avisos || []) linhas.push(`- aviso: ${a}`)
  linhas.push('')
}
linhas.push('## Texto integral (PDF)', '', `- ${Object.entries(textos).map(([k, v]) => `${k}: ${v}`).join(' · ')}`, '')
const relatorio = linhas.join('\n')
console.log(relatorio)
if (process.env.GITHUB_STEP_SUMMARY) await writeFile(process.env.GITHUB_STEP_SUMMARY, relatorio, { flag: 'a' })
process.exit(resultados.every((r) => r.ok) ? 0 : 1)
