/**
 * Roda o teste de fumaça e grava:
 *   fumaca-resultado/relatorio.md  (resumo legível)
 *   fumaca-resultado/<id>.json     (amostra de cada resposta)
 * Uso: pnpm fumaca            (todas)
 *      pnpm fumaca camara     (só as que começam com "camara")
 * Sai com erro se alguma verificação essencial falhar. Fonte fora do ar (rede, tempo esgotado, HTTP 5xx) é aviso, não
 * falha: é problema do site, não do conector, e a verificação horária já avisa a equipe se passar da tolerância.
 * Mudança de formato e qualquer outro erro continuam vermelhos.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { descreverErro, foraDoAr, VERIFICACOES } from './verificacoes'

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
    let semRede = false
    try {
      res = await v.rodar(ctx)
    } catch (e) {
      semRede = foraDoAr(e)
      res = { ok: false, notas: [`${semRede ? 'fonte fora do ar' : 'erro'}: ${descreverErro(e)}`] }
    }
    const ms = Date.now() - t0
    Object.assign(ctx, res.contexto || {})
    if (!res.ok && v.essencial && !semRede) falhaEssencial = true
    const marca = res.ok ? '✅' : v.essencial && !semRede ? '❌' : '⚠️'
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
