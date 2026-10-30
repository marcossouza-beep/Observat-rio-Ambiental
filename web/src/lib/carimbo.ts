import { PDFDocument, PDFName, PDFString, rgb, StandardFonts, type PDFFont } from 'pdf-lib'
import QRCode from 'qrcode'

/**
 * Carimba cada página do PDF com a identificação do parecer e o link rastreável (texto clicável + QR),
 * no pé da página. O arquivo guardado não muda: o carimbo é feito na hora do download.
 * Se o PDF não puder ser lido (protegido, corrompido), devolve null e o download segue sem carimbo.
 */
export async function carimbarPdf(original: Uint8Array, c: { linhas: [string, string]; url: string; titulo: string }): Promise<Uint8Array | null> {
  let doc: PDFDocument
  try {
    doc = await PDFDocument.load(original, { updateMetadata: false })
  } catch {
    return null
  }
  const fonte = await doc.embedFont(StandardFonts.Helvetica)
  const qr = await doc.embedPng(await QRCode.toBuffer(c.url, { margin: 0, width: 160, errorCorrectionLevel: 'M' }))
  const cinza = rgb(0.4, 0.45, 0.42)
  const tam = 6.5
  const lado = 30 // QR, em pontos
  const margem = 18

  for (const pagina of doc.getPages()) {
    const { width } = pagina.getSize()
    const larguraTexto = width - 2 * margem - lado - 8
    const l1 = caber(c.linhas[0], fonte, tam, larguraTexto)
    const l2 = caber(c.linhas[1], fonte, tam, larguraTexto)
    pagina.drawLine({ start: { x: margem, y: margem + lado + 4 }, end: { x: width - margem, y: margem + lado + 4 }, thickness: 0.4, color: rgb(0.85, 0.88, 0.86) })
    pagina.drawText(l1, { x: margem, y: margem + 14, size: tam, font: fonte, color: cinza })
    pagina.drawText(l2, { x: margem, y: margem + 5, size: tam, font: fonte, color: cinza })
    pagina.drawImage(qr, { x: width - margem - lado, y: margem, width: lado, height: lado })
    // A linha do link e o QR são clicáveis
    const anotacoes = [
      [margem, margem + 3, margem + fonte.widthOfTextAtSize(l2, tam), margem + 12],
      [width - margem - lado, margem, width - margem, margem + lado],
    ].map(([x1, y1, x2, y2]) =>
      doc.context.register(
        doc.context.obj({
          Type: 'Annot',
          Subtype: 'Link',
          Rect: [x1, y1, x2, y2],
          Border: [0, 0, 0],
          A: { Type: 'Action', S: 'URI', URI: PDFString.of(c.url) },
        }),
      ),
    )
    const existentes = pagina.node.Annots()
    if (existentes) anotacoes.forEach((a) => existentes.push(a))
    else pagina.node.set(PDFName.of('Annots'), doc.context.obj(anotacoes))
  }
  doc.setTitle(c.titulo)
  doc.setSubject(c.linhas[0])
  doc.setKeywords([c.url])
  return doc.save()
}

/** Corta o texto com reticências para caber na largura; troca o que a fonte padrão não desenha. */
function caber(texto: string, fonte: PDFFont, tam: number, largura: number) {
  const t = paraWinAnsi(texto)
  if (fonte.widthOfTextAtSize(t, tam) <= largura) return t
  let corte = t.length
  while (corte > 0 && fonte.widthOfTextAtSize(`${t.slice(0, corte)}...`, tam) > largura) corte--
  return `${t.slice(0, corte).trimEnd()}...`
}

/** As fontes padrão do PDF usam WinAnsi: acentos, º, ª e · existem; o resto vira equivalente simples. */
export function paraWinAnsi(t: string) {
  return t
    .replace(/[‐-―]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/→/g, '->')
    .replace(/…/g, '...')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '')
}
