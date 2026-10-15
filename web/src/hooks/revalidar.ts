import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

/**
 * Atualiza as páginas públicas assim que o conteúdo muda (além da revalidação periódica).
 * O site é pequeno: revalidar a partir da raiz é simples e não deixa página velha para trás.
 * Fora do Next (scripts, testes) não há cache a limpar, e o erro é ignorado.
 */
export async function revalidarSite() {
  try {
    const { revalidatePath } = await import('next/cache')
    revalidatePath('/', 'layout')
  } catch {
    // fora de uma requisição do Next
  }
}

// A coleta grava centenas de itens de uma vez: pede silêncio (context.semRevalidar) e revalida uma vez no fim.
export const revalidarAoMudar: CollectionAfterChangeHook = async ({ doc, context }) => {
  if (!context?.semRevalidar) await revalidarSite()
  return doc
}
export const revalidarAoApagar: CollectionAfterDeleteHook = async ({ doc, context }) => {
  if (!context?.semRevalidar) await revalidarSite()
  return doc
}
