/**
 * Roda o teste de fumaça e grava:
 *   fumaca-resultado/relatorio.md  (resumo legível)
 *   fumaca-resultado/<id>.json     (amostra de cada resposta)
 * Uso: pnpm fumaca            (todas)
 *      pnpm fumaca camara     (só as que começam com "camara")
 * Sai com erro se alguma verificação essencial falhar.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { descreverErro, VERIFICACOES } from './verificacoes'

const saida = path.resolve(process.cwd(), 'fumaca-resultado')
const filtro = process.argv[2]

async function main() {
  await mkdir(saida, { recursive: true })
  const ctx: Record<string, unknown> = {}
  const linhas: string[] = [`# Teste de fumaça das APIs`, '', `Rodado em ${new Date().toISOString()}`, '']
  let falhaEssencial = false
  for (const v of VERIFICACOES.filter((x) => !filtro || x.id.startsWith(filtro))) {
    const t0 = Date.now()
    let res
    try {
      res = await v.rodar(ctx)
    } catch (e) {
      res = { ok: false, notas: [`erro: ${descreverErro(e)}`] }
    }
    const ms = Date.now() - t0
    Object.assign(ctx, res.contexto || {})
    if (!res.ok && v.essencial) falhaEssencial = true
    const marca = res.ok ? '✅' : v.essencial ? '❌' : '⚠️'
    linhas.push(`## ${marca} ${v.fonte} · ${v.descricao}`, '', `\`${v.id}\` · ${ms} ms${v.essencial ? ' · essencial' : ''}`, '', ...res.notas.map((n) => `- ${n}`), '')
    if (res.amostra !== undefined) {
      const json = JSON.stringify(res.amostra, null, 2)
      await writeFile(path.join(saida, `${v.id}.json`), json.length > 400_000 ? json.slice(0, 400_000) : json)
    }
    console.log(`${marca} ${v.id} (${ms} ms)\n   ${res.notas.join('\n   ')}`)
  }
  const relatorio = linhas.join('\n')
  await writeFile(path.join(saida, 'relatorio.md'), relatorio)
  if (process.env.GITHUB_STEP_SUMMARY) await writeFile(process.env.GITHUB_STEP_SUMMARY, relatorio, { flag: 'a' })
  if (falhaEssencial) {
    console.error('\nAlguma verificação essencial falhou.')
    process.exit(1)
  }
}

main()
