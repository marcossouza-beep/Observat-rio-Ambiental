import { DefaultTemplate } from '@payloadcms/next/templates'
import { Gutter } from '@payloadcms/ui'
import { redirect } from 'next/navigation'
import type { AdminViewServerProps } from 'payload'

/** Moldura das telas próprias do painel: menu do Payload e exige login. */
export function Moldura({ props, titulo, sub, children }: { props: AdminViewServerProps; titulo: string; sub?: string; children: React.ReactNode }) {
  const { initPageResult, params, searchParams } = props
  const req = initPageResult.req
  if (!req.user) redirect('/admin/login')
  return (
    <DefaultTemplate
      i18n={req.i18n}
      locale={initPageResult.locale}
      params={params}
      payload={req.payload}
      permissions={initPageResult.permissions}
      searchParams={searchParams}
      user={req.user || undefined}
      visibleEntities={initPageResult.visibleEntities}
    >
      <Gutter>
        <div className="obs-tela">
          <header className="obs-cab">
            <h1>{titulo}</h1>
            {sub ? <p>{sub}</p> : null}
          </header>
          {children}
        </div>
      </Gutter>
    </DefaultTemplate>
  )
}
