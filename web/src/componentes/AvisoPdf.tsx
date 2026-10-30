'use client'
import { useSearchParams } from 'next/navigation'

const MATERIAL: Record<string, string> = { nt: 'do parecer técnico', qc: 'do quadro comparativo', pdf: 'de um PDF' }

/**
 * Usar dentro de <Suspense>: lê o endereço só no navegador, sem tirar a página do cache.
 * Quem chega pelo link impresso no PDF (/r/…) vê de que versão era o documento que tem em mãos e, se o
 * parecer mudou desde então, que esta página traz a versão atual.
 */
export function AvisoPdf({ versaoAtual, atualizadoEm }: { versaoAtual: number; atualizadoEm?: string }) {
  const q = useSearchParams()
  const m = q.get('pdf') || ''
  const v = Number(q.get('v'))
  const origem = MATERIAL[m] && Number.isInteger(v) && v > 0 ? { m, v } : null
  if (!origem) return null
  const antigo = origem.v < versaoAtual
  return (
    <section className={`block ${antigo ? 'b-alert' : 'b-par'}`} role="note">
      <p>
        {antigo ? (
          <>
            <b>
              Você chegou pelo link {MATERIAL[origem.m]} da versão {origem.v} deste resumo prévio.
            </b>{' '}
            Esta página traz a versão {versaoAtual}
            {atualizadoEm ? `, atualizada em ${atualizadoEm}` : ''}. O que mudou está logo abaixo.
          </>
        ) : (
          <>
            Você chegou pelo link {MATERIAL[origem.m]}. O documento que você tem é da versão {origem.v}, a mesma desta página.
          </>
        )}
      </p>
    </section>
  )
}
