/**
 * Endpoints públicos do site (inscrição, acesso sem senha, conta, avisos, download, correções, descadastro).
 * Regras: respostas genéricas onde a existência do e-mail importa; sessão em cookie assinado;
 * nada de dados pessoais em respostas que não sejam da própria pessoa.
 */
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { Endpoint, Payload, PayloadRequest } from 'payload'
import { enviarAgora, modelo } from './lib/email'
import { carimbarPdf } from './lib/carimbo'
import { caminhoLink, linhasCarimbo, nomeMaterial, type TipoMaterial } from './lib/linkRastreavel'
import { dataBR, NOME_SITE, SITE_URL } from './lib/rotulos'
import { cookieSessao, criarSessao, emailValido, lerCookie, lerDescadastro, lerSessao, novoLinkMagico, resumo } from './lib/sessao'
import type { Assinante, Autor, Material, Proposicao, Versao } from './payload-types'
import { PERFIS, SUBPERFIS } from './collections/Publico'

const json = (dados: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(dados), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extra } })
const redirecionar = (para: string, cookie?: string) =>
  new Response(null, { status: 303, headers: { Location: para, 'Cache-Control': 'no-store', ...(cookie ? { 'Set-Cookie': cookie } : {}) } })
const caminhoSeguro = (p: unknown) => (typeof p === 'string' && p.startsWith('/') && !p.startsWith('//') && !p.includes('\\') ? p : null)

async function corpo(req: PayloadRequest): Promise<Record<string, unknown>> {
  try {
    if (typeof req.json === 'function') return ((await req.json()) as Record<string, unknown>) || {}
  } catch {}
  return {}
}

/** Limite simples por IP (protege contra abuso; cada instância tem o seu contador). */
const janelas = new Map<string, number[]>()
function excedeu(req: PayloadRequest, grupo: string, max = 8, minutos = 10) {
  const ip = (req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'local').split(',')[0].trim()
  const k = `${grupo}:${ip}`
  const agora = Date.now()
  const lista = (janelas.get(k) || []).filter((t) => agora - t < minutos * 6e4)
  lista.push(agora)
  janelas.set(k, lista)
  return lista.length > max
}

async function assinanteDaSessao(req: PayloadRequest): Promise<Assinante | null> {
  const s = lerSessao(lerCookie(req.headers.get('cookie')))
  if (!s) return null
  try {
    return (await req.payload.findByID({ collection: 'assinantes', id: s.id, depth: 0 })) as Assinante
  } catch {
    return null
  }
}

async function enviarLink(payload: Payload, a: Assinante, para: string | null, primeiraVez: boolean) {
  const l = novoLinkMagico()
  await payload.update({ collection: 'assinantes', id: a.id, data: { tokenHash: l.hash, tokenExpira: l.expira }, overrideAccess: true })
  const url = `${SITE_URL}/api/entrar/confirmar?token=${encodeURIComponent(l.token)}${para ? `&para=${encodeURIComponent(para)}` : ''}`
  const m = modelo(
    primeiraVez
      ? { titulo: 'Confirme sua inscrição', paragrafos: [`Olá${a.nome ? `, ${a.nome.split(' ')[0]}` : ''}! Falta só confirmar seu e-mail para liberar as notas técnicas e os quadros comparativos.`, 'O link vale por 1 hora. Se não foi você, ignore este e-mail.'], botao: { texto: 'Confirmar e entrar', url } }
      : { titulo: 'Seu link de acesso', paragrafos: ['Use o botão abaixo para entrar. Não precisa de senha.', 'O link vale por 1 hora e só funciona uma vez. Se não foi você, ignore este e-mail.'], botao: { texto: 'Entrar', url } },
  )
  await enviarAgora(payload, { tipo: 'acesso', para: a.email, assunto: primeiraVez ? `Confirme sua inscrição em ${NOME_SITE}` : `Seu link de acesso a ${NOME_SITE}`, ...m, assinante: a.id })
}

const idsValidos = (v: unknown) => (Array.isArray(v) ? v.map((x) => Number(x)).filter((n) => Number.isInteger(n) && n > 0).slice(0, 50) : [])
const textoCurto = (v: unknown, max = 120) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const UFS = new Set('AC AL AM AP BA CE DF ES GO MA MG MS MT PA PB PE PI PR RJ RN RO RR RS SC SE SP TO'.split(' '))

function perfilValido(b: Record<string, unknown>) {
  const perfil = PERFIS.includes(b.perfil as never) ? (b.perfil as (typeof PERFIS)[number]) : undefined
  const sub = perfil && SUBPERFIS[perfil]?.includes(b.subperfil as string) ? (b.subperfil as string) : undefined
  const curso = perfil === 'Estudante' ? textoCurto(b.curso, 80) || undefined : undefined
  const uf = typeof b.uf === 'string' && UFS.has(b.uf.toUpperCase()) ? b.uf.toUpperCase() : undefined
  return { perfil, subperfil: sub, curso, uf }
}

const inscricao: Endpoint = {
  path: '/inscricao',
  method: 'post',
  handler: async (req) => {
    if (excedeu(req, 'inscricao')) return json({ ok: false, erro: 'Muitas tentativas. Tente de novo em alguns minutos.' }, 429)
    const b = await corpo(req)
    if (b.site) return json({ ok: true }) // armadilha para robôs
    const email = textoCurto(b.email, 254).toLowerCase()
    if (!emailValido(email)) return json({ ok: false, erro: 'Informe um e-mail válido.' }, 400)
    if (b.consentimento !== true) return json({ ok: false, erro: 'É preciso concordar com a Política de Privacidade.' }, 400)
    const para = caminhoSeguro(b.para)
    const avisar = idsValidos(b.avisar)
    const existente = (await req.payload.find({ collection: 'assinantes', where: { email: { equals: email } }, limit: 1, depth: 0 })).docs[0] as Assinante | undefined
    if (existente) {
      // Não mexe nos dados de quem já existe (evita que terceiros alterem); só acrescenta o pedido de aviso.
      if (avisar.length) {
        const atual = (existente.avisarParecer || []).map((x) => (typeof x === 'object' ? x.id : x))
        await req.payload.update({ collection: 'assinantes', id: existente.id, data: { avisarParecer: [...new Set([...atual, ...avisar])] } })
      }
      await enviarLink(req.payload, existente, para, !existente.confirmadoEm)
      return json({ ok: true })
    }
    const p = perfilValido(b)
    const novo = (await req.payload.create({
      collection: 'assinantes',
      data: {
        email,
        nome: textoCurto(b.nome, 120) || undefined,
        ...p,
        temas: idsValidos(b.temas),
        biomas: idsValidos(b.biomas),
        avisarParecer: avisar,
        alertas: b.alertas === true,
        resumoSemanal: b.resumoSemanal === true,
        aceitaEmails: true,
        consentimentoEm: new Date().toISOString(),
        origemProposicao: avisar[0],
      },
    })) as Assinante
    const imp = b.imprensa as Record<string, unknown> | undefined
    if (p.perfil === 'Jornalista' && imp && textoCurto(imp.veiculo) && textoCurto(imp.link, 300) && imp.autoriza === true) {
      await req.payload.create({
        collection: 'credenciamentos',
        data: {
          assinante: novo.id,
          veiculo: textoCurto(imp.veiculo),
          tipoVeiculo: textoCurto(imp.tipo) || undefined,
          funcao: textoCurto(imp.funcao) || undefined,
          linkComprovacao: textoCurto(imp.link, 300),
          emailProfissional: emailValido(imp.emailProfissional) ? (imp.emailProfissional as string) : undefined,
          registroMtb: textoCurto(imp.mtb, 40) || undefined,
          autorizaVerificacao: true,
        },
      })
    }
    await enviarLink(req.payload, novo, para, true)
    return json({ ok: true })
  },
}

const entrar: Endpoint = {
  path: '/entrar',
  method: 'post',
  handler: async (req) => {
    if (excedeu(req, 'entrar')) return json({ ok: false, erro: 'Muitas tentativas. Tente de novo em alguns minutos.' }, 429)
    const b = await corpo(req)
    const email = textoCurto(b.email, 254).toLowerCase()
    if (!emailValido(email)) return json({ ok: false, erro: 'Informe um e-mail válido.' }, 400)
    const a = (await req.payload.find({ collection: 'assinantes', where: { email: { equals: email } }, limit: 1, depth: 0 })).docs[0] as Assinante | undefined
    if (a) await enviarLink(req.payload, a, caminhoSeguro(b.para), !a.confirmadoEm)
    return json({ ok: true }) // mesma resposta exista ou não o e-mail
  },
}

const confirmar: Endpoint = {
  path: '/entrar/confirmar',
  method: 'get',
  handler: async (req) => {
    const u = new URL(req.url || '', SITE_URL)
    const token = u.searchParams.get('token') || ''
    const para = caminhoSeguro(u.searchParams.get('para')) || '/conta?bemvindo=1'
    if (!token) return redirecionar('/entrar?erro=link')
    const r = await req.payload.find({
      collection: 'assinantes',
      where: { tokenHash: { equals: resumo(token) }, tokenExpira: { greater_than: new Date().toISOString() } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    const a = r.docs[0] as Assinante | undefined
    if (!a) return redirecionar('/entrar?erro=link')
    await req.payload.update({
      collection: 'assinantes',
      id: a.id,
      overrideAccess: true,
      data: { tokenHash: null, tokenExpira: null, ...(a.confirmadoEm ? {} : { confirmadoEm: new Date().toISOString() }) },
    })
    return redirecionar(para, cookieSessao(criarSessao(a.id)))
  },
}

const sessao: Endpoint = {
  path: '/sessao',
  method: 'get',
  handler: async (req) => {
    const a = await assinanteDaSessao(req)
    if (!a) return json({ logado: false })
    const ids = (v: unknown[] | null | undefined) => (v || []).map((x) => (x && typeof x === 'object' ? (x as { id: number }).id : x))
    const cred = (await req.payload.find({ collection: 'credenciamentos', where: { assinante: { equals: a.id } }, limit: 1, depth: 0 })).docs[0]
    return json({
      logado: true,
      nome: a.nome,
      email: a.email,
      perfil: a.perfil,
      subperfil: a.subperfil,
      curso: a.curso,
      uf: a.uf,
      alertas: a.alertas,
      resumoSemanal: a.resumoSemanal,
      aceitaEmails: a.aceitaEmails,
      seguindo: ids(a.seguindo),
      avisar: ids(a.avisarParecer),
      temas: ids(a.temas),
      biomas: ids(a.biomas),
      seguirParlamentares: ids(a.seguirParlamentares),
      imprensa: cred?.status || null,
    })
  },
}

const sair: Endpoint = {
  path: '/sair',
  method: 'post',
  handler: async () => json({ ok: true }, 200, { 'Set-Cookie': cookieSessao('', true) }),
}

const conta: Endpoint = {
  path: '/conta',
  method: 'post',
  handler: async (req) => {
    const a = await assinanteDaSessao(req)
    if (!a) return json({ ok: false, erro: 'Entre de novo.' }, 401)
    const b = await corpo(req)
    const p = perfilValido({ perfil: b.perfil ?? a.perfil, subperfil: b.subperfil, curso: b.curso, uf: b.uf ?? a.uf })
    const dados: Record<string, unknown> = {}
    if ('nome' in b) dados.nome = textoCurto(b.nome, 120)
    if ('perfil' in b || 'subperfil' in b || 'curso' in b || 'uf' in b) Object.assign(dados, p)
    for (const k of ['alertas', 'resumoSemanal', 'aceitaEmails'] as const) if (typeof b[k] === 'boolean') dados[k] = b[k]
    for (const k of ['temas', 'biomas'] as const) if (Array.isArray(b[k])) dados[k] = idsValidos(b[k])
    await req.payload.update({ collection: 'assinantes', id: a.id, data: dados })
    return json({ ok: true })
  },
}

const listaDaConta =
  (campo: 'seguindo' | 'avisarParecer' | 'seguirParlamentares', chave: 'proposicao' | 'parlamentar' = 'proposicao'): Endpoint['handler'] =>
  async (req) => {
    const a = await assinanteDaSessao(req)
    if (!a) return json({ ok: false, erro: 'Entre para continuar.' }, 401)
    const b = await corpo(req)
    const id = Number(b[chave])
    if (!Number.isInteger(id)) return json({ ok: false }, 400)
    const atual = ((a[campo] as unknown[]) || []).map((x) => (x && typeof x === 'object' ? (x as { id: number }).id : x)) as number[]
    const ligar = b.ligar !== false
    const nova = ligar ? [...new Set([...atual, id])] : atual.filter((x) => x !== id)
    await req.payload.update({ collection: 'assinantes', id: a.id, data: { [campo]: nova } })
    return json({ ok: true, ligado: ligar })
  }

const seguir: Endpoint = { path: '/conta/seguir', method: 'post', handler: listaDaConta('seguindo') }
const avisar: Endpoint = { path: '/conta/avisar', method: 'post', handler: listaDaConta('avisarParecer') }
const seguirParlamentar: Endpoint = { path: '/conta/seguir-parlamentar', method: 'post', handler: listaDaConta('seguirParlamentares', 'parlamentar') }

const meusDados: Endpoint = {
  path: '/conta/dados',
  method: 'get',
  handler: async (req) => {
    const a = await assinanteDaSessao(req)
    if (!a) return json({ ok: false }, 401)
    const completo = await req.payload.findByID({ collection: 'assinantes', id: a.id, depth: 1 })
    const envios = await req.payload.find({ collection: 'envios', where: { assinante: { equals: a.id } }, limit: 1000, depth: 0, select: { tipo: true, assunto: true, status: true, createdAt: true } })
    const cred = await req.payload.find({ collection: 'credenciamentos', where: { assinante: { equals: a.id } }, depth: 0 })
    return new Response(JSON.stringify({ inscricao: completo, credenciamento: cred.docs, emailsRecebidos: envios.docs }, null, 2), {
      headers: { 'Content-Type': 'application/json', 'Content-Disposition': 'attachment; filename="meus-dados.json"', 'Cache-Control': 'no-store' },
    })
  },
}

const excluir: Endpoint = {
  path: '/conta/excluir',
  method: 'post',
  handler: async (req) => {
    const a = await assinanteDaSessao(req)
    if (!a) return json({ ok: false }, 401)
    await req.payload.delete({ collection: 'credenciamentos', where: { assinante: { equals: a.id } } })
    await req.payload.delete({ collection: 'envios', where: { assinante: { equals: a.id } } })
    await req.payload.delete({ collection: 'assinantes', id: a.id })
    // Prova de atendimento sem dados pessoais
    await req.payload.create({
      collection: 'pedidos',
      data: { tipo: 'lgpd', email: 'excluido@anonimo.invalid', texto: `Exclusão de conta feita pela própria pessoa em ${new Date().toISOString().slice(0, 10)}.`, decisao: 'atendido' },
    })
    return json({ ok: true }, 200, { 'Set-Cookie': cookieSessao('', true) })
  },
}

async function descadastrarPorToken(req: PayloadRequest) {
  const u = new URL(req.url || '', SITE_URL)
  const t = lerDescadastro(u.searchParams.get('t'))
  if (!t) return false
  try {
    await req.payload.update({ collection: 'assinantes', id: t.id, data: { aceitaEmails: false, alertas: false, resumoSemanal: false } })
    return true
  } catch {
    return false
  }
}
const descadastrarGet: Endpoint = {
  path: '/descadastrar',
  method: 'get',
  handler: async (req) => redirecionar(`/descadastro?ok=${(await descadastrarPorToken(req)) ? 1 : 0}`),
}
const descadastrarPost: Endpoint = {
  path: '/descadastrar',
  method: 'post',
  handler: async (req) => json({ ok: await descadastrarPorToken(req) }),
}

const baixar: Endpoint = {
  path: '/baixar/:id',
  method: 'get',
  handler: async (req) => {
    const id = Number(req.routeParams?.id)
    const m = Number.isInteger(id) ? await req.payload.findByID({ collection: 'materiais', id, depth: 0 }).catch(() => null) : null
    if (!m?.filename) return json({ ok: false, erro: 'Material não encontrado.' }, 404)
    if (m.visibilidade !== 'publico') {
      const a = await assinanteDaSessao(req)
      if (!a) return redirecionar(`/entrar?para=${encodeURIComponent(`/api/baixar/${id}`)}`)
      if (!a.confirmadoEm) return redirecionar('/conta?confirme=1')
    }
    const cab = { 'Content-Type': m.mimeType || 'application/pdf', 'Content-Disposition': `attachment; filename="${m.filename}"`, 'Cache-Control': 'private, no-store' }
    let bytes: Uint8Array
    if (process.env.S3_BUCKET) {
      const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3')
      const s3 = new S3Client({
        endpoint: process.env.S3_ENDPOINT,
        region: process.env.S3_REGION || 'us-east-1',
        forcePathStyle: true,
        credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID || '', secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '' },
      })
      const obj = await s3.send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: `materiais/${m.filename}` }))
      if (!obj.Body) return json({ ok: false, erro: 'Arquivo indisponível.' }, 404)
      bytes = await obj.Body.transformToByteArray()
    } else {
      const arquivo = path.resolve(process.cwd(), 'arquivos', 'materiais', m.filename)
      if (!existsSync(arquivo)) return json({ ok: false, erro: 'Arquivo indisponível.' }, 404)
      bytes = await readFile(arquivo)
    }
    const carimbado = await carimbar(req, m, bytes).catch((e) => {
      req.payload.logger.warn(`PDF ${m.id} sem carimbo: ${e instanceof Error ? e.message : e}`)
      return null
    })
    return new Response(Buffer.from(carimbado || bytes), { headers: cab })
  },
}

/**
 * Carimba o PDF com a identificação do parecer a que pertence e o link rastreável de volta ao site.
 * Material que não está ligado a parecer publicado sai como está.
 */
async function carimbar(req: PayloadRequest, m: Material, bytes: Uint8Array) {
  const r = await req.payload.find({
    collection: 'pareceres',
    where: { status: { equals: 'publicado' }, or: [{ 'materiais.notaTecnica': { equals: m.id } }, { 'materiais.quadroComparativo': { equals: m.id } }] },
    limit: 1,
    depth: 1,
  })
  const p = r.docs[0]
  if (!p) return null
  const lei = p.proposicao as Proposicao
  const analisada = p.versaoTexto && typeof p.versaoTexto === 'object' ? (p.versaoTexto as Versao) : null
  const autor = p.autor && typeof p.autor === 'object' ? (p.autor as Autor) : null
  const idDe = (v: unknown) => (v && typeof v === 'object' ? (v as { id: number }).id : v)
  const material: TipoMaterial = idDe(p.materiais?.quadroComparativo) === m.id ? 'quadro_comparativo' : 'nota_tecnica'
  const link = caminhoLink({ parecer: p.id, material, versao: p.versao ?? 1 })
  return carimbarPdf(bytes, {
    linhas: linhasCarimbo({
      site: SITE_URL,
      nomeSite: NOME_SITE,
      material,
      proposta: lei?.rotulo || 'a proposta',
      versao: p.versao ?? 1,
      publicadoEm: dataBR(p.atualizadoEm || p.publicadoEm),
      textoAnalisado: analisada ? `${analisada.rotulo || 'texto'}, de ${dataBR(analisada.data)}` : null,
      autor: autor?.nome,
      link,
      baixadoEm: dataBR(new Date().toISOString()),
    }),
    url: `${SITE_URL}${link}`,
    titulo: `${nomeMaterial(material)} · ${lei?.rotulo || ''}`.trim(),
  })
}

const pedidoPublico: Endpoint = {
  path: '/pedir-correcao',
  method: 'post',
  handler: async (req) => {
    if (excedeu(req, 'pedido', 5)) return json({ ok: false, erro: 'Muitos pedidos. Tente de novo em alguns minutos.' }, 429)
    const b = await corpo(req)
    if (b.site) return json({ ok: true })
    const email = textoCurto(b.email, 254).toLowerCase()
    const texto = textoCurto(b.texto, 3000)
    if (!emailValido(email)) return json({ ok: false, erro: 'Informe um e-mail para a resposta.' }, 400)
    if (texto.length < 10) return json({ ok: false, erro: 'Conte o que está errado.' }, 400)
    const parecerId = Number(b.parecer)
    const parecer = Number.isInteger(parecerId) ? await req.payload.findByID({ collection: 'pareceres', id: parecerId, depth: 0 }).catch(() => null) : null
    await req.payload.create({ collection: 'pedidos', data: { tipo: 'correcao', email, nome: textoCurto(b.nome) || undefined, texto, parecer: parecer?.id } })
    return json({ ok: true })
  },
}

export const endpointsSite: Endpoint[] = [inscricao, entrar, confirmar, sessao, sair, conta, seguir, avisar, seguirParlamentar, meusDados, excluir, descadastrarGet, descadastrarPost, baixar, pedidoPublico]
