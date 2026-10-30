import type { Metadata } from 'next'
import { Trilha } from '@/componentes/Trilha'
import { NOME_SITE } from '@/lib/rotulos'

export const metadata: Metadata = { title: 'Termos de uso', alternates: { canonical: '/termos' } }

/* Texto-base. Deve ser revisado pelo autor antes do lançamento. */
export default function Termos() {
  return (
    <div className="wrap">
      <Trilha itens={[{ nome: 'Termos de uso', caminho: '/termos' }]} />
      <header className="lawhead">
        <h1>Termos de uso</h1>
        <p className="nota-fonte">Versão 1.0</p>
      </header>
      <div className="texto-legal">
        <h2>O que é</h2>
        <p>
          {NOME_SITE} acompanha a legislação ambiental e publica resumos prévios e pareceres técnicos escritos e assinados pelo autor. Eles expressam a análise técnica do autor e não representam nenhuma
          instituição.
        </p>
        <h2>Não é consultoria</h2>
        <p>Os resumos prévios são análises públicas e não substituem orientação jurídica para um caso concreto.</p>
        <h2>Textos de lei e dados</h2>
        <p>Textos de lei e dados de tramitação vêm das fontes oficiais, com link para cada uma. Em caso de diferença, vale a fonte oficial.</p>
        <h2>Uso do conteúdo</h2>
        <p>Você pode citar os resumos prévios com o nome do autor e o link para a página. Os materiais em PDF são para uso pessoal, acadêmico ou profissional, sem revenda.</p>
        <h2>Correções</h2>
        <p>Encontrou um erro? Use “Encontrou um erro? Avise” no resumo prévio. Respondemos no prazo informado e registramos as correções no próprio resumo prévio.</p>
        <h2>Mudanças nestes termos</h2>
        <p>Quando mudarem, a versão e a data serão atualizadas nesta página.</p>
      </div>
    </div>
  )
}
