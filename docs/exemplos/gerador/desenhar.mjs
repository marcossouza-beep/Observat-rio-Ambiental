// Gráficos do exemplo (SVG → PNG): série observada + cenários com o limiar da H1; potencialidades por dimensão.
// Uso: node desenhar.mjs <dados.json> <pasta de saída>
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { chromium } from '../../../web/node_modules/@playwright/test/index.mjs'
const [arqDados, saida] = process.argv.slice(2)
const d = JSON.parse(readFileSync(arqDados, 'utf8'))
const COR = { A: '#2a78d6', B: '#eb6834', C: '#1baf7a', obs: '#3d3d3a' }
const T1 = '#0b0b0b', T2 = '#52514e', T3 = '#8a8984', GRADE = '#e6e5e0', SUP = '#fcfcfb'
const F = `font-family="Liberation Sans, Arial, sans-serif"`
const W = 900, H = 340
const fmt = (v) => v.toLocaleString('pt-BR')

function trajetoria() {
  const m = { l: 62, r: 250, t: 24, b: 44 }, pw = W - m.l - m.r, ph = H - m.t - m.b
  const anos = [...d.observado.anos, ...d.anos.slice(1)]
  const todos = [...d.observado.valores, ...d.cenarios.flatMap((c) => c.valores), d.limiar.valor]
  const passo = 250
  const min = 0, max = Math.ceil(Math.max(...todos) / passo) * passo
  const x = (ano) => m.l + (anos.indexOf(ano) * pw) / (anos.length - 1)
  const y = (v) => m.t + ph - ((v - min) / (max - min)) * ph
  let s = ''
  for (let v = min; v <= max; v += passo) s += `<line x1="${m.l}" x2="${m.l + pw}" y1="${y(v)}" y2="${y(v)}" stroke="${GRADE}"/><text x="${m.l - 8}" y="${y(v) + 4}" text-anchor="end" font-size="12" fill="${T2}" ${F}>${fmt(v)}</text>`
  anos.forEach((a) => (s += `<text x="${x(a)}" y="${H - m.b + 20}" text-anchor="middle" font-size="12" fill="${T2}" ${F}>${a}</text>`))
  s += `<text x="${m.l}" y="${m.t - 10}" font-size="12" fill="${T2}" ${F}>${d.unidade}</text>`
  // separação entre observado e cenários
  const x25 = x(d.anos[0])
  s += `<line x1="${x25}" x2="${x25}" y1="${m.t}" y2="${m.t + ph}" stroke="${GRADE}" stroke-width="1"/><text x="${x25 - 6}" y="${m.t + 12}" text-anchor="end" font-size="11" fill="${T2}" ${F}>observado</text><text x="${x25 + 6}" y="${m.t + 12}" font-size="11" fill="${T2}" ${F}>cenários por premissa</text>`
  s += `<line x1="${m.l}" x2="${m.l + pw}" y1="${y(d.limiar.valor)}" y2="${y(d.limiar.valor)}" stroke="${T3}" stroke-width="1.5"/>`
  const linha = (anosL, vals, cor, larg = 2.5) =>
    `<polyline fill="none" stroke="${cor}" stroke-width="${larg}" stroke-linejoin="round" stroke-linecap="round" points="${vals.map((v, i) => `${x(anosL[i])},${y(v)}`).join(' ')}"/>` +
    vals.map((v, i) => `<circle cx="${x(anosL[i])}" cy="${y(v)}" r="4" fill="${cor}" stroke="${SUP}" stroke-width="2"/>`).join('')
  s += linha(d.observado.anos, d.observado.valores, COR.obs)
  // Rótulo acima e à direita do ponto (a linha desce para a direita); o último, centrado
  d.observado.anos.forEach((a, i) => {
    const ultimo = i === d.observado.anos.length - 1
    s += `<text x="${x(a) + (ultimo ? 0 : 7)}" y="${y(d.observado.valores[i]) - 9}" text-anchor="${ultimo ? 'middle' : 'start'}" font-size="11" fill="${T1}" ${F}>${fmt(d.observado.valores[i])}</text>`
  })
  for (const c of d.cenarios) s += linha(d.anos, c.valores, COR[c.id])
  const fim = [...d.cenarios.map((c) => ({ txt: `<tspan font-weight="700">${fmt(c.valores.at(-1))}</tspan> ${c.nome}`, ty: y(c.valores.at(-1)) + 4 })), { txt: `${d.limiar.rotulo} (${fmt(d.limiar.valor)})`, ty: y(d.limiar.valor) + 4, cinza: true }].sort((a, b) => a.ty - b.ty)
  for (let i = 1; i < fim.length; i++) if (fim[i].ty - fim[i - 1].ty < 16) fim[i].ty = fim[i - 1].ty + 16
  for (const f of fim) s += `<text x="${m.l + pw + 10}" y="${f.ty}" font-size="12" fill="${f.cinza ? T2 : T1}" ${F}>${f.txt}</text>`
  const leg = [['obs', 'Observado (MapBiomas)'], ...d.cenarios.map((c) => [c.id, c.nome.replace(/ \(.*\)$/, '')])]
  // Legenda em linha, cada item com a largura do próprio texto
  let lx = m.l
  for (const [k, n] of leg) {
    s += `<rect x="${lx}" y="${H + 12}" width="12" height="12" rx="3" fill="${COR[k]}"/><text x="${lx + 18}" y="${H + 22}" font-size="11.5" fill="${T1}" ${F}>${n}</text>`
    lx += 18 + n.length * 6.2 + 22
  }
  return s
}

function potencial() {
  const m = { l: 170, r: 30, t: 30, b: 44 }, pw = W - m.l - m.r, ph = H - m.t - m.b
  const x = (v) => m.l + ((v + 2.6) / 5.2) * pw
  const banda = ph / d.dimensoes.length, bar = 16, gap = 2
  let s = ''
  for (let v = -2; v <= 2; v++) s += `<line x1="${x(v)}" x2="${x(v)}" y1="${m.t}" y2="${m.t + ph}" stroke="${v === 0 ? T3 : GRADE}" stroke-width="${v === 0 ? 1.5 : 1}"/><text x="${x(v)}" y="${H - m.b + 20}" text-anchor="middle" font-size="12" fill="${T2}" ${F}>${v > 0 ? '+' + v : v}</text>`
  s += `<text x="${x(-2)}" y="${H - 6}" font-size="12" fill="${T2}" ${F}>← piora em relação ao cenário A</text><text x="${x(2)}" y="${H - 6}" text-anchor="end" font-size="12" fill="${T2}" ${F}>melhora em relação ao cenário A →</text>`
  d.dimensoes.forEach((dim, i) => {
    const cy = m.t + banda * i + banda / 2
    s += `<text x="${m.l - 12}" y="${cy + 4}" text-anchor="end" font-size="13" fill="${T1}" ${F}>${dim}</text>`
    ;['B', 'C'].forEach((k, j) => {
      const v = d.potencial[k][i], by = cy - bar - gap / 2 + j * (bar + gap)
      const x0 = x(0), x1 = x(v), lx = Math.min(x0, x1), wd = Math.abs(x1 - x0)
      s += wd > 0 ? `<rect x="${lx}" y="${by}" width="${wd}" height="${bar}" rx="4" fill="${COR[k]}"/>` : `<rect x="${x0 - 2}" y="${by}" width="4" height="${bar}" rx="2" fill="${COR[k]}"/>`
      const tx = v < 0 ? lx - 6 : v > 0 ? lx + wd + 6 : x0 + 8
      s += `<text x="${tx}" y="${by + 12}" text-anchor="${v < 0 ? 'end' : 'start'}" font-size="11" fill="${T2}" ${F}>${k}: ${v > 0 ? '+' + v : v}</text>`
    })
  })
  const nomes = Object.fromEntries(d.cenarios.map((c) => [c.id, c.nome]))
  ;['B', 'C'].forEach((k, i) => (s += `<rect x="${m.l + i * 300}" y="6" width="12" height="12" rx="3" fill="${COR[k]}"/><text x="${m.l + i * 300 + 18}" y="16" font-size="12" fill="${T1}" ${F}>${nomes[k]}</text>`))
  return s
}

const svg = (corpo, h) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${h}" viewBox="0 0 ${W} ${h}"><rect width="100%" height="100%" fill="${SUP}"/>${corpo}</svg>`
const graficos = { 'grafico-trajetoria': svg(trajetoria(), H + 34), 'grafico-potencialidades': svg(potencial(), H) }
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
for (const [nome, s] of Object.entries(graficos)) {
  const p = await b.newPage({ viewport: { width: W, height: 420 }, deviceScaleFactor: 2 })
  await p.setContent(`<html><body style="margin:0;background:${SUP}">${s}</body></html>`)
  await p.locator('svg').screenshot({ path: path.join(saida, nome + '.png') })
}
await b.close()
console.log('ok')
