import type { Metadata } from 'next'
import { FormInscricao } from '@/componentes/FormInscricao'
import { listarTemasEBiomas, payloadSite } from '@/dados/consultas'
import { PERFIS, SUBPERFIS } from '@/collections/Publico'

export const metadata: Metadata = {
  title: 'Inscreva-se grátis',
  description: 'Pareceres técnicos e quadros comparativos em PDF e aviso no dia em que sai o resumo prévio. Grátis e sem senha.',
  alternates: { canonical: '/inscricao' },
}

export default async function Inscricao({ searchParams }: { searchParams: Promise<{ para?: string }> }) {
  const { para } = await searchParams
  const [{ temas, biomas }, ajustes] = await Promise.all([listarTemasEBiomas(), (await payloadSite()).findGlobal({ slug: 'ajustes', depth: 0 })])
  return (
    <div className="wrap inscricao">
      <header className="lawhead inscricao-topo">
        <h1>
          Acompanhe as leis <span className="t-em">ambientais</span> que importam para você
        </h1>
        <p>O resumo prévio é aberto a todos. Inscritos baixam os pareceres técnicos e os quadros comparativos em PDF e recebem um aviso no dia em que sai o resumo prévio das leis que seguem.</p>
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
