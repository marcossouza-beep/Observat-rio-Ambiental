import { RichText } from '@payloadcms/richtext-lexical/react'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'

/** Texto rico do editor (Lexical) em HTML. */
export function Rico({ valor }: { valor?: unknown }) {
  if (!valor || typeof valor !== 'object') return null
  return (
    <div className="prosa">
      <RichText data={valor as SerializedEditorState} />
    </div>
  )
}
