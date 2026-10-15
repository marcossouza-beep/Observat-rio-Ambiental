import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { artigoPrimeiro, extrairTextoPdf, limparTexto } from '@/coleta/textos'

const pdf = (nome: string) => new Uint8Array(readFileSync(path.resolve(__dirname, '../fixtures/coleta/pdf', `${nome}.pdf`)))

describe('texto integral dos PDFs', () => {
  it('junta as linhas quebradas e mantém os dispositivos em linhas próprias', () => {
    const t = limparTexto('Art. 1º Esta Lei estabelece a Política Nacional de Mineração Urbana, visando à\npromoção da econo-\nmia circular.\nParágrafo único. Para os fins\ndesta Lei:\nI - mineração urbana;\nArt. 2º Fica')
    expect(t.split('\n')).toEqual([
      'Art. 1º Esta Lei estabelece a Política Nacional de Mineração Urbana, visando à promoção da economia circular.',
      'Parágrafo único. Para os fins desta Lei:',
      'I - mineração urbana;',
      'Art. 2º Fica',
    ])
  })

  it('PDF da Câmara: projeto de lei com Art. 1º', async () => {
    const { texto, paginas } = await extrairTextoPdf(pdf('camara-recente'))
    expect(paginas).toBe(12)
    expect(texto).toMatch(/O CONGRESSO NACIONAL decreta:/)
    expect(artigoPrimeiro(texto)).toMatch(/^Art\. 1º Esta Lei estabelece a Política Nacional de Mineração Urbana/)
  })

  it('PDF do Senado: Lei Geral do Licenciamento (autógrafo)', async () => {
    const { texto, paginas } = await extrairTextoPdf(pdf('senado-documento'))
    expect(paginas).toBe(56)
    expect(artigoPrimeiro(texto)).toMatch(/^Art\. 1º Esta Lei, denominada Lei Geral do Licenciamento Ambiental, estabelece normas gerais/)
  })
})
