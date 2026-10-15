import type { Metadata } from 'next'
import { MinhaConta } from '@/componentes/MinhaConta'
import { SUBPERFIS } from '@/collections/Publico'
import { listarTemasEBiomas } from '@/dados/consultas'

export const metadata: Metadata = { title: 'Minha conta', robots: { index: false, follow: false } }

const PERGUNTAS: Record<string, string> = {
  'Advogado(a)': 'Onde você atua?',
  'Servidor(a) público(a)': 'Em que órgão?',
  Empresa: 'Em que setor?',
  'ONG / movimento': 'Qual o foco?',
  'Pesquisador(a)': 'Em que área?',
  'Cidadão(ã)': 'O que mais descreve você?',
}

export default async function Conta({ searchParams }: { searchParams: Promise<{ bemvindo?: string; confirme?: string }> }) {
  const s = await searchParams
  const { temas, biomas } = await listarTemasEBiomas()
  return (
    <div className="wrap">
      <header className="lawhead" style={{ paddingTop: 32 }}>
        <h1>Minha conta</h1>
        {s.bemvindo ? <p className="ok">Tudo certo! Sua inscrição está confirmada e os materiais em PDF estão liberados.</p> : null}
        {s.confirme ? <p className="alerta">Confirme seu e-mail pelo link que enviamos para baixar os materiais.</p> : null}
      </header>
      <MinhaConta subperfis={SUBPERFIS} perguntas={PERGUNTAS} temas={temas.map((t) => ({ id: t.id, nome: t.nome }))} biomas={biomas.map((b) => ({ id: b.id, nome: b.nome }))} />
    </div>
  )
}
