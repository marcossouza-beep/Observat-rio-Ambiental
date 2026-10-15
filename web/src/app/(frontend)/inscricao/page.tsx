import type { Metadata } from 'next'
import { FormInscricao } from '@/componentes/FormInscricao'
import { listarTemasEBiomas, payloadSite } from '@/dados/consultas'
import { PERFIS, SUBPERFIS } from '@/collections/Publico'

export const metadata: Metadata = {
  title: 'Inscreva-se grátis',
  description: 'Notas técnicas e quadros comparativos em PDF e aviso no dia em que sai o parecer. Grátis e sem senha.',
  alternates: { canonical: '/inscricao' },
}

export default async function Inscricao({ searchParams }: { searchParams: Promise<{ para?: string }> }) {
  const { para } = await searchParams
  const [{ temas, biomas }, ajustes] = await Promise.all([listarTemasEBiomas(), (await payloadSite()).findGlobal({ slug: 'ajustes', depth: 0 })])
  return (
    <div className="wrap">
      <header className="lawhead" style={{ paddingTop: 32 }}>
        <h1>
          Acompanhe as leis <span className="t-em">ambientais</span> que importam para você
        </h1>
        <p style={{ color: 'var(--gray)' }}>O parecer é aberto a todos. Inscritos baixam as notas técnicas e os quadros comparativos em PDF e recebem um aviso no dia em que sai o parecer das leis que seguem. Grátis, sem senha, cancele com um clique.</p>
      </header>
      <FormInscricao
        perfis={PERFIS}
        subperfis={SUBPERFIS}
        temas={temas.map((t) => ({ id: t.id, nome: t.nome }))}
        biomas={biomas.map((b) => ({ id: b.id, nome: b.nome }))}
        para={para && para.startsWith('/') && !para.startsWith('//') ? para : undefined}
        prazoImprensa={ajustes.prazos?.credenciamento || 2}
      />
    </div>
  )
}
