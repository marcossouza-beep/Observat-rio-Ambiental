import type { UIFieldServerProps } from 'payload'
import { caminhoLink, type TipoMaterial } from '../lib/linkRastreavel'
import { SITE_URL } from '../lib/rotulos'

/**
 * Links rastreáveis dos PDFs deste parecer e quantos leitores chegaram por eles.
 * O sistema já carimba o link em cada página ao baixar; aqui o autor pode copiá-lo para o documento.
 */
export async function Rastro({ data, payload }: UIFieldServerProps) {
  if (!data?.id) return null
  const versao = (data.versao as number | undefined) ?? 1
  const contar = (material: TipoMaterial) =>
    payload.count({ collection: 'acessos-pdf', where: { parecer: { equals: data.id }, material: { equals: material } } }).then((r) => r.totalDocs)
  const [nt, qc] = await Promise.all([contar('nota_tecnica'), contar('quadro_comparativo')])
  const linhas: [string, TipoMaterial, number][] = [
    ['Nota técnica', 'nota_tecnica', nt],
    ['Quadro comparativo', 'quadro_comparativo', qc],
  ]
  return (
    <div className="obs-checagem obs-rastro">
      <h4>Links dos PDFs</h4>
      <p className="obs-nota">Carimbados sozinhos no pé de cada página, com QR, ao baixar. Levam à versão atual deste parecer.</p>
      <ul>
        {linhas.map(([nome, material, n]) => (
          <li key={material}>
            <b>{nome}</b>: <code>{`${SITE_URL}${caminhoLink({ parecer: data.id as number, material, versao })}`}</code>
            <br />
            <span className="obs-nota">
              {n} {n === 1 ? 'acesso' : 'acessos'} vindos deste PDF
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
