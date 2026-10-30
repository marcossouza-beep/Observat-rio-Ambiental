import { payloadSite } from '@/dados/consultas'
import { destinoLink, lerCodigo } from '@/lib/linkRastreavel'
import { SITE_URL } from '@/lib/rotulos'

/**
 * Link impresso nos PDFs: registra de onde o leitor veio e leva ao parecer no site (versão atual).
 * Código inválido ou parecer fora do ar → página de pareceres.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ codigo: string }> }) {
  const rastro = lerCodigo((await params).codigo)
  const base = SITE_URL
  if (!rastro) return Response.redirect(new URL('/pareceres', base), 302)
  const payload = await payloadSite()
  const parecer = await payload.findByID({ collection: 'pareceres', id: rastro.parecer, depth: 0, overrideAccess: false }).catch(() => null)
  if (!parecer?.slug || parecer.status !== 'publicado') return Response.redirect(new URL('/pareceres', base), 302)
  await payload
    .create({ collection: 'acessos-pdf', data: { parecer: parecer.id, material: rastro.material, versaoPdf: rastro.versao, em: new Date().toISOString() } })
    .catch((e) => payload.logger.warn(`Acesso vindo de PDF não registrado: ${e instanceof Error ? e.message : e}`))
  return Response.redirect(new URL(destinoLink(parecer.slug, rastro), base), 302)
}
