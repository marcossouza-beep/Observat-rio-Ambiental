/**
 * Leitura mínima de arquivos ZIP (o INLABS entrega cada edição do DOU como um ZIP de XMLs).
 * Suporta arquivos guardados sem compressão e com "deflate", que é o que o INLABS usa.
 */
import { inflateRawSync } from 'node:zlib'

export type ArquivoZip = { nome: string; conteudo: Buffer }

const FIM_DIRETORIO = 0x06054b50
const ENTRADA_DIRETORIO = 0x02014b50
const CABECALHO_LOCAL = 0x04034b50

export function lerZip(zip: Buffer, filtro: (nome: string) => boolean = () => true): ArquivoZip[] {
  // O "fim do diretório central" fica nos últimos 64 KB (22 bytes + comentário)
  let fim = -1
  for (let i = zip.length - 22; i >= Math.max(0, zip.length - 65_557); i--) {
    if (zip.readUInt32LE(i) === FIM_DIRETORIO) {
      fim = i
      break
    }
  }
  if (fim < 0) throw new Error('Arquivo ZIP inválido (diretório central não encontrado)')
  const total = zip.readUInt16LE(fim + 10)
  let p = zip.readUInt32LE(fim + 16)
  const arquivos: ArquivoZip[] = []
  for (let n = 0; n < total; n++) {
    if (zip.readUInt32LE(p) !== ENTRADA_DIRETORIO) throw new Error('Arquivo ZIP inválido (entrada do diretório)')
    const metodo = zip.readUInt16LE(p + 10)
    const tamanhoComprimido = zip.readUInt32LE(p + 20)
    const tamNome = zip.readUInt16LE(p + 28)
    const tamExtra = zip.readUInt16LE(p + 30)
    const tamComentario = zip.readUInt16LE(p + 32)
    const local = zip.readUInt32LE(p + 42)
    const nome = zip.subarray(p + 46, p + 46 + tamNome).toString('utf8')
    p += 46 + tamNome + tamExtra + tamComentario
    if (nome.endsWith('/') || !filtro(nome)) continue
    if (zip.readUInt32LE(local) !== CABECALHO_LOCAL) throw new Error(`Arquivo ZIP inválido (cabeçalho de ${nome})`)
    const inicio = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28)
    const dados = zip.subarray(inicio, inicio + tamanhoComprimido)
    if (metodo === 0) arquivos.push({ nome, conteudo: Buffer.from(dados) })
    else if (metodo === 8) arquivos.push({ nome, conteudo: inflateRawSync(dados) })
    else throw new Error(`Compressão ${metodo} não suportada em ${nome}`)
  }
  return arquivos
}
