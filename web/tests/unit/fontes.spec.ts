import { describe, expect, it } from 'vitest'
import { emRecesso, horasUteisDesde, limiteDaFonte, notaPublica, semExpediente, situacaoFonte } from '@/lib/fontes'
import { foraDoAr } from '@/coleta/fumaca/verificacoes'
import { ErroFormato } from '@/coleta/tipos'

const agora = new Date('2026-10-14T10:00:00Z')
const h = (horas: number) => new Date(agora.getTime() - horas * 3_600_000)

describe('fontes', () => {
  it('ok dentro de 8 horas', () => {
    expect(situacaoFonte({ ultimaColetaOk: h(4), itensUltimaColeta: 200, mediaItens30d: 190 }, agora)).toBe('ok')
  })
  it('atrasada depois de 8 horas', () => {
    expect(situacaoFonte({ ultimaColetaOk: h(12) }, agora)).toBe('atrasada')
  })
  it('volume baixo abaixo de 30% da média', () => {
    expect(situacaoFonte({ ultimaColetaOk: h(1), itensUltimaColeta: 2, mediaItens30d: 14 }, agora)).toBe('volume_baixo')
    expect(situacaoFonte({ ultimaColetaOk: h(1), itensUltimaColeta: 1, mediaItens30d: 2 }, agora)).toBe('ok')
  })
  it('manual e nunca coletada', () => {
    expect(situacaoFonte({ manual: true }, agora)).toBe('manual')
    expect(situacaoFonte({}, agora)).toBe('nunca_coletada')
  })
  it('nota pública mostra a data e avisa quando a fonte cai', () => {
    expect(notaPublica({ ultimaColetaOk: h(1) }, 'Senado', agora)).toContain('última coleta: 14/10, 06:00')
    expect(notaPublica({ ultimaColetaOk: h(12) }, 'Senado', agora)).toContain('A fonte oficial (Senado) está fora do ar')
  })

  it('tolerância: 8 h nas federais, 48 h úteis nas estaduais, ou a da própria fonte', () => {
    expect(limiteDaFonte({ esfera: 'federal' })).toBe(8)
    expect(limiteDaFonte({ esfera: 'estadual' })).toBe(48)
    expect(limiteDaFonte({ esfera: 'estadual', toleranciaHoras: 96 })).toBe(96)
    expect(situacaoFonte({ ultimaColetaOk: h(12), toleranciaHoras: 24 }, agora)).toBe('ok')
  })

  it('estadual: fim de semana e recesso não contam no atraso', () => {
    const segunda = new Date('2026-10-19T10:00:00Z') // 07h de segunda em Brasília
    const sexta = new Date('2026-10-16T10:00:00Z')
    expect(horasUteisDesde(sexta, segunda)).toBe(24) // 17 h de sexta + 7 h de segunda
    expect(situacaoFonte({ esfera: 'estadual', ultimaColetaOk: sexta }, segunda)).toBe('ok')
    expect(situacaoFonte({ esfera: 'federal', ultimaColetaOk: sexta }, segunda)).toBe('atrasada')
    expect(situacaoFonte({ esfera: 'estadual', ultimaColetaOk: new Date('2026-10-14T10:00:00Z') }, segunda)).toBe('atrasada')
    expect(emRecesso(new Date('2026-07-25T15:00:00Z'))).toBe(true)
    expect(emRecesso(new Date('2026-01-10T15:00:00Z'))).toBe(true)
    expect(emRecesso(new Date('2026-10-14T15:00:00Z'))).toBe(false)
    expect(situacaoFonte({ esfera: 'estadual', ultimaColetaOk: new Date('2026-07-17T20:00:00Z') }, new Date('2026-08-03T12:00:00Z'))).toBe('ok')
  })

  it('estadual: volume baixo não acusa no fim de semana', () => {
    const sabado = new Date('2026-10-17T15:00:00Z')
    expect(semExpediente(sabado)).toBe(true)
    expect(situacaoFonte({ esfera: 'estadual', ultimaColetaOk: sabado, itensUltimaColeta: 0, mediaItens30d: 40 }, sabado)).toBe('ok')
    expect(situacaoFonte({ esfera: 'estadual', ultimaColetaOk: agora, itensUltimaColeta: 0, mediaItens30d: 40 }, agora)).toBe('volume_baixo')
  })

  it('teste das APIs: fonte fora do ar é aviso; mudança de formato não', () => {
    expect(foraDoAr(new Error('INLABS fora do ar no login (HTTP 502). A coleta do DOU tenta de novo na próxima rodada.'))).toBe(true)
    expect(foraDoAr(new Error('fetch failed'))).toBe(true)
    expect(foraDoAr(new Error('HTTP 503 em https://x'))).toBe(true)
    expect(foraDoAr(new ErroFormato('almg', 'listaItem', 'direcionada'))).toBe(false)
    expect(foraDoAr(new Error('HTTP 404 em https://x'))).toBe(false)
  })
})
