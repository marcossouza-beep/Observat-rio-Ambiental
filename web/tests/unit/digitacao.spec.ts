import { describe, expect, it } from 'vitest'
import { sugerirEmail } from '@/lib/digitacao'

describe('sugerirEmail', () => {
  it('sugere o domínio comum mais próximo', () => {
    expect(sugerirEmail('ana@gmial.com')).toBe('ana@gmail.com')
    expect(sugerirEmail('ana@gmail.con')).toBe('ana@gmail.com')
    expect(sugerirEmail('Ana@Hotmial.com')).toBe('ana@hotmail.com')
    expect(sugerirEmail('ana@yahoo.com.bt')).toBe('ana@yahoo.com.br')
  })
  it('não mexe em domínios corretos ou desconhecidos', () => {
    expect(sugerirEmail('ana@gmail.com')).toBeNull()
    expect(sugerirEmail('ana@ymail.com')).toBeNull()
    expect(sugerirEmail('ana@bol.com.br')).toBeNull()
    expect(sugerirEmail('ana@mpto.mp.br')).toBeNull()
    expect(sugerirEmail('ana@ibama.gov.br')).toBeNull()
    expect(sugerirEmail('sem-arroba')).toBeNull()
  })
})
