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

export type ItemEmail = { texto: string; url?: string; detalhe?: string }
export type SecaoEmail = { titulo: string; itens: ItemEmail[] }

/** Monta o HTML (sóbrio, legível em qualquer leitor de e-mail) e o texto puro. */
export function modelo(a: { titulo: string; paragrafos: string[]; secoes?: SecaoEmail[]; botao?: { texto: string; url: string }; descadastro?: string; motivo?: string }) {
  const p = a.paragrafos.map((t) => `<p style="margin:0 0 14px;line-height:1.55">${esc(t)}</p>`).join('')
  const secoes = (a.secoes || [])
    .filter((s) => s.itens.length)
    .map(
      (s) =>
        `<h2 style="font-size:16px;margin:24px 0 10px">${esc(s.titulo)}</h2>` +
        s.itens
          .map(
            (i) =>
              `<p style="margin:0 0 12px;line-height:1.5">${i.url ? `<a href="${esc(i.url)}" style="color:#23864F;font-weight:600">${esc(i.texto)}</a>` : `<b>${esc(i.texto)}</b>`}${i.detalhe ? `<br><span style="color:#66726B;font-size:14px">${esc(i.detalhe)}</span>` : ''}</p>`,
          )
          .join(''),
    )
    .join('')
  const botao = a.botao
    ? `<p style="margin:20px 0"><a href="${esc(a.botao.url)}" style="background:#2FA765;color:#fff;text-decoration:none;padding:11px 18px;border-radius:999px;font-weight:600;display:inline-block">${esc(a.botao.texto)}</a></p><p style="font-size:13px;color:#66726B;word-break:break-all">Ou copie o endereço: ${esc(a.botao.url)}</p>`
    : ''
  const rodape = a.descadastro
    ? `<p style="font-size:12px;color:#9AA59F;margin-top:28px">${esc(a.motivo || `Você recebe este e-mail porque se inscreveu em ${NOME_SITE}.`)} Ajuste o que recebe em <a href="${esc(`${SITE_URL}/conta`)}" style="color:#66726B">Minha conta</a> ou <a href="${esc(a.descadastro)}" style="color:#66726B">pare de receber e-mails</a>.</p>`
    : ''
  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#FBFCFB;font-family:Arial,Helvetica,sans-serif;color:#16201A"><div style="max-width:560px;margin:0 auto;padding:28px 20px"><p style="margin:0 0 22px"><img src="${esc(`${SITE_URL}/marca/logo.png`)}" alt="${esc(NOME_SITE)}" width="159" height="48" style="display:block;border:0;font-weight:800;font-size:17px;color:#16201A"></p><h1 style="font-size:21px;margin:0 0 16px">${esc(a.titulo)}</h1>${p}${secoes}${botao}${rodape}</div></body></html>`
  const textoSecoes = (a.secoes || []).filter((s) => s.itens.length).flatMap((s) => ['', s.titulo.toUpperCase(), ...s.itens.map((i) => `- ${i.texto}${i.detalhe ? ` (${i.detalhe})` : ''}${i.url ? `: ${i.url}` : ''}`)])
  const texto = [a.titulo, '', ...a.paragrafos, ...textoSecoes, ...(a.botao ? ['', `${a.botao.texto}: ${a.botao.url}`] : []), ...(a.descadastro ? ['', `Ajustar o que recebo: ${SITE_URL}/conta`, `Não quero mais receber: ${a.descadastro}`] : [])].join('\n')
  return { html, texto }
}

type TipoEnvio = 'acesso' | 'aviso_publicacao' | 'alerta' | 'resumo' | 'comunicado' | 'resposta_pedido' | 'aviso_equipe'

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
