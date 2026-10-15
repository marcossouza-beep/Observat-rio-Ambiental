/**
 * E-mails do observatório: modelos simples e a fila (coleção Envios).
 * - Link de acesso: sai na hora.
 * - Avisos de publicação, respostas, comunicados: entram na fila e saem pela tarefa "enviar-fila"
 *   (a cada 15 min), com nova tentativa em caso de erro.
 * Todo e-mail para inscrito leva o descadastro em um clique.
 */
import type { Payload, PayloadRequest } from 'payload'
import { NOME_SITE, SITE_URL } from './rotulos'
import { tokenDescadastro } from './sessao'

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

export function linkDescadastro(assinanteId: number | string) {
  return `${SITE_URL}/api/descadastrar?t=${encodeURIComponent(tokenDescadastro(assinanteId))}`
}

/** Monta o HTML (sóbrio, legível em qualquer leitor de e-mail) e o texto puro. */
export function modelo(a: { titulo: string; paragrafos: string[]; botao?: { texto: string; url: string }; descadastro?: string }) {
  const p = a.paragrafos.map((t) => `<p style="margin:0 0 14px;line-height:1.55">${esc(t)}</p>`).join('')
  const botao = a.botao
    ? `<p style="margin:20px 0"><a href="${esc(a.botao.url)}" style="background:#2FA765;color:#fff;text-decoration:none;padding:11px 18px;border-radius:999px;font-weight:600;display:inline-block">${esc(a.botao.texto)}</a></p><p style="font-size:13px;color:#66726B;word-break:break-all">Ou copie o endereço: ${esc(a.botao.url)}</p>`
    : ''
  const rodape = a.descadastro
    ? `<p style="font-size:12px;color:#9AA59F;margin-top:28px">Você recebe este e-mail porque se inscreveu em ${esc(NOME_SITE)}. <a href="${esc(a.descadastro)}" style="color:#66726B">Não quero mais receber e-mails</a>.</p>`
    : ''
  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#FBFCFB;font-family:Arial,Helvetica,sans-serif;color:#16201A"><div style="max-width:560px;margin:0 auto;padding:28px 20px"><p style="font-weight:800;font-size:17px;margin:0 0 22px">${esc(NOME_SITE)}</p><h1 style="font-size:21px;margin:0 0 16px">${esc(a.titulo)}</h1>${p}${botao}${rodape}</div></body></html>`
  const texto = [a.titulo, '', ...a.paragrafos, ...(a.botao ? ['', `${a.botao.texto}: ${a.botao.url}`] : []), ...(a.descadastro ? ['', `Não quero mais receber: ${a.descadastro}`] : [])].join('\n')
  return { html, texto }
}

type TipoEnvio = 'acesso' | 'aviso_publicacao' | 'alerta' | 'resumo' | 'embargo' | 'comunicado' | 'resposta_pedido'

/** Coloca um e-mail na fila. */
export async function enfileirar(
  payload: Payload,
  e: { tipo: TipoEnvio; para: string; assunto: string; html: string; texto: string; assinante?: number | string; parecer?: number | string; comunicado?: number | string },
  req?: PayloadRequest,
) {
  return payload.create({
    collection: 'envios',
    req,
    data: {
      tipo: e.tipo,
      para: e.para,
      assunto: e.assunto,
      html: e.html,
      texto: e.texto,
      assinante: (e.assinante ?? undefined) as number | undefined,
      parecer: (e.parecer ?? undefined) as number | undefined,
      comunicado: (e.comunicado ?? undefined) as number | undefined,
      status: 'fila',
      tentativas: 0,
    },
  })
}

/** Envia um registro da fila e grava o resultado. */
export async function enviarRegistro(payload: Payload, envio: { id: number | string; para?: string | null; assunto?: string | null; html?: string | null; texto?: string | null; tentativas?: number | null; assinante?: unknown }) {
  try {
    const assinanteId = envio.assinante && typeof envio.assinante === 'object' ? (envio.assinante as { id: number }).id : (envio.assinante as number | undefined)
    await payload.sendEmail({
      to: envio.para!,
      subject: envio.assunto!,
      html: envio.html!,
      text: envio.texto || undefined,
      ...(assinanteId ? { headers: { 'List-Unsubscribe': `<${linkDescadastro(assinanteId)}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } } : {}),
    })
    await payload.update({ collection: 'envios', id: envio.id, data: { status: 'enviado', erro: null, tentativas: (envio.tentativas ?? 0) + 1 } })
    return true
  } catch (err) {
    const t = (envio.tentativas ?? 0) + 1
    await payload.update({ collection: 'envios', id: envio.id, data: { status: t >= 4 ? 'erro' : 'fila', erro: String((err as Error).message).slice(0, 300), tentativas: t } })
    return false
  }
}

/** Envia agora (link de acesso), registrando na coleção Envios. */
export async function enviarAgora(payload: Payload, e: Parameters<typeof enfileirar>[1]) {
  const reg = await enfileirar(payload, e)
  return enviarRegistro(payload, reg)
}
