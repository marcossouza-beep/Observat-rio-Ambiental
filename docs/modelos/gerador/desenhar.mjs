// Gráficos do quadro comparativo em SVG → PNG (navegador). Cores: 3 primeiras do paletário validado (cenários A, B, C).
import { readFileSync, writeFileSync } from 'node:fs'
import { chromium } from '../../../web/node_modules/@playwright/test/index.mjs'
const dir = new URL('.', import.meta.url).pathname
const d = JSON.parse(readFileSync(dir + 'dados.json', 'utf8'))
const COR = { A: '#2a78d6', B: '#eb6834', C: '#1baf7a' }
const T1 = '#0b0b0b', T2 = '#52514e', T3 = '#8a8984', GRADE = '#e6e5e0', SUP = '#fcfcfb'
const F = `font-family="Liberation Sans, Arial, sans-serif"`
const W = 900, H = 330

function trajetoria() {
  const m = { l: 56, r: 250, t: 22, b: 44 }, pw = W - m.l - m.r, ph = H - m.t - m.b
  const max = 160, min = 100
  const x = (i) => m.l + (i * pw) / (d.anos.length - 1)
  const y = (v) => m.t + ph - ((v - min) / (max - min)) * ph
  let s = ''
  for (let v = min; v <= max; v += 20) s += `<line x1="${m.l}" x2="${m.l + pw}" y1="${y(v)}" y2="${y(v)}" stroke="${GRADE}" stroke-width="1"/><text x="${m.l - 8}" y="${y(v) + 4}" text-anchor="end" font-size="12" fill="${T2}" ${F}>${v}</text>`
  d.anos.forEach((a, i) => (s += `<text x="${x(i)}" y="${H - m.b + 20}" text-anchor="middle" font-size="12" fill="${T2}" ${F}>${a}</text>`))
  s += `<text x="${m.l}" y="${m.t - 8}" font-size="12" fill="${T2}" ${F}>${d.unidade}</text>`
  // limiar da hipótese: linha fina cinza, rotulada
  s += `<line x1="${m.l}" x2="${m.l + pw}" y1="${y(d.limiar.valor)}" y2="${y(d.limiar.valor)}" stroke="${T3}" stroke-width="1.5"/>`
  s += `<text x="${m.l + pw + 10}" y="${y(d.limiar.valor) + 4}" font-size="12" fill="${T2}" ${F}>Limiar H1: ${d.limiar.valor}</text>`
  const fim = d.cenarios.map((c) => ({ c, v: c.valores.at(-1) }))
  for (const c of d.cenarios) {
    s += `<polyline fill="none" stroke="${COR[c.id]}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" points="${c.valores.map((v, i) => `${x(i)},${y(v)}`).join(' ')}"/>`
    c.valores.forEach((v, i) => (s += `<circle cx="${x(i)}" cy="${y(v)}" r="4" fill="${COR[c.id]}" stroke="${SUP}" stroke-width="2"/>`))
  }
  // rótulos diretos no fim de cada linha, afastados para não colidir
  const pos = fim.map((f) => ({ ...f, ty: y(f.v) + 4 })).sort((a, b) => a.ty - b.ty)
  for (let i = 1; i < pos.length; i++) if (pos[i].ty - pos[i - 1].ty < 16) pos[i].ty = pos[i - 1].ty + 16
  for (const p of pos) s += `<text x="${m.l + pw + 10}" y="${p.ty}" font-size="12" fill="${T1}" ${F}><tspan font-weight="700">${p.v}</tspan> ${p.c.nome.split('. ')[0]}. ${p.c.nome.split('. ')[1]}</text>`
  return s
}

function potencial() {
  const m = { l: 170, r: 30, t: 30, b: 44 }, pw = W - m.l - m.r, ph = H - m.t - m.b
  // Folga além de ±2 para os rótulos de valor não encostarem nos nomes das dimensões
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
      const x0 = x(0), x1 = x(v), lx = Math.min(x0, x1), wd = Math.max(Math.abs(x1 - x0), 0)
      if (wd > 0) s += `<rect x="${lx}" y="${by}" width="${wd}" height="${bar}" rx="4" fill="${COR[k]}"/>`
      else s += `<rect x="${x0 - 2}" y="${by}" width="4" height="${bar}" rx="2" fill="${COR[k]}"/>`
      const tx = v < 0 ? lx - 6 : v > 0 ? lx + wd + 6 : x0 + 8
      s += `<text x="${tx}" y="${by + 12}" text-anchor="${v < 0 ? 'end' : 'start'}" font-size="11" fill="${T2}" ${F}>${k}: ${v > 0 ? '+' + v : v}</text>`
    })
  })
  // legenda
  ;[['B', 'B. Aprovada como está'], ['C', 'C. Aprovada com ajustes']].forEach(([k, n], i) => (s += `<rect x="${m.l + i * 230}" y="6" width="12" height="12" rx="3" fill="${COR[k]}"/><text x="${m.l + i * 230 + 18}" y="16" font-size="12" fill="${T1}" ${F}>${n}</text>`))
  return s
}

const legendaTraj = () => d.cenarios.map((c, i) => `<rect x="${56 + i * 230}" y="${H - 14}" width="12" height="12" rx="3" fill="${COR[c.id]}"/><text x="${56 + i * 230 + 18}" y="${H - 4}" font-size="12" fill="${T1}" ${F}>${c.nome}</text>`).join('')
const svg = (corpo, h = H) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${h}" viewBox="0 0 ${W} ${h}"><rect width="100%" height="100%" fill="${SUP}"/>${corpo}</svg>`
const graficos = { 'grafico-trajetoria': svg(trajetoria() + `<g transform="translate(0,26)">${legendaTraj()}</g>`, H + 26), 'grafico-potencialidades': svg(potencial()) }

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
for (const [nome, s] of Object.entries(graficos)) {
  writeFileSync(dir + nome + '.svg', s)
  const p = await b.newPage({ viewport: { width: W, height: 400 }, deviceScaleFactor: 2 })
  await p.setContent(`<html><body style="margin:0;background:${SUP}">${s}</body></html>`)
  await p.locator('svg').screenshot({ path: dir + nome + '.png' })
}
await b.close()
console.log('ok')
