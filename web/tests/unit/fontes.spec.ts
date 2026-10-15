import { describe, expect, it } from 'vitest'
import { notaPublica, situacaoFonte } from '@/lib/fontes'

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
})
