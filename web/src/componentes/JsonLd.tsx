/** Dados estruturados (schema.org). O conteúdo vem do banco; escapamos "<" para não fechar a tag. */
export function JsonLd({ dados }: { dados: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(dados).replace(/</g, '\\u003c') }} />
}
