import type { PayloadRequest } from 'payload'
import {
  calcularPrazo,
  PRAZOS_PADRAO,
  ROTULO_COMPROMISSO,
  type RegraPrazo,
  type TipoCompromisso,
} from '../lib/compromissos'
import { civilParaISO } from '../lib/datas'

type Alvo = 'proposicoes' | 'pareceres' | 'pedidos' | 'credenciamentos'

export async function regrasDePrazo(req: PayloadRequest): Promise<Record<TipoCompromisso, RegraPrazo>> {
  try {
    const a = (await req.payload.findGlobal({ slug: 'ajustes', req, depth: 0 })) as {
      prazos?: Partial<Record<'parecer' | 'atualizacao' | 'correcao' | 'credenciamento' | 'lgpd', number | null>>
    }
    const p = a?.prazos || {}
    return {
      parecer_prometido: { dias: p.parecer || PRAZOS_PADRAO.parecer_prometido.dias, uteis: false },
      atualizacao: { dias: p.atualizacao || PRAZOS_PADRAO.atualizacao.dias, uteis: false },
      correcao: { dias: p.correcao || PRAZOS_PADRAO.correcao.dias, uteis: true },
      credenciamento: { dias: p.credenciamento || PRAZOS_PADRAO.credenciamento.dias, uteis: true },
      lgpd: { dias: p.lgpd || PRAZOS_PADRAO.lgpd.dias, uteis: false },
    }
  } catch {
    return PRAZOS_PADRAO
  }
}

/** Abre um compromisso, se ainda não houver um aberto do mesmo tipo para o mesmo alvo. Devolve o prazo (ISO). */
export async function abrirCompromisso(
  req: PayloadRequest,
  a: { tipo: TipoCompromisso; alvo: Alvo; alvoId: string | number; proposicao?: string | number | null; descricao: string; prazo?: string },
): Promise<string> {
  const existentes = await req.payload.find({
    collection: 'compromissos',
    req,
    depth: 0,
    limit: 1,
    where: {
      tipo: { equals: a.tipo },
      alvo: { equals: a.alvo },
      alvoId: { equals: String(a.alvoId) },
      status: { in: ['aberto', 'suspenso'] },
    },
  })
  if (existentes.docs[0]) return existentes.docs[0].prazoEm as string
  const agora = new Date()
  const prazoEm = a.prazo || civilParaISO(calcularPrazo(a.tipo, agora, await regrasDePrazo(req)))
  await req.payload.create({
    collection: 'compromissos',
    req,
    data: {
      tipo: a.tipo,
      alvo: a.alvo,
      alvoId: String(a.alvoId),
      proposicao: (a.proposicao ?? undefined) as number | undefined,
      descricao: `${ROTULO_COMPROMISSO[a.tipo]}: ${a.descricao}`.slice(0, 250),
      abertoEm: agora.toISOString(),
      prazoEm,
      status: 'aberto',
    },
  })
  return prazoEm
}

/** Fecha (cumprido ou retirado) ou suspende os compromissos abertos de um alvo. */
export async function mudarCompromissos(
  req: PayloadRequest,
  a: { alvo: Alvo; alvoId: string | number; tipos?: TipoCompromisso[]; status: 'cumprido' | 'retirado' | 'suspenso' | 'aberto' },
) {
  const where: Record<string, unknown> = {
    alvo: { equals: a.alvo },
    alvoId: { equals: String(a.alvoId) },
    status: { in: a.status === 'aberto' ? ['suspenso'] : ['aberto', 'suspenso'] },
  }
  if (a.tipos) where.tipo = { in: a.tipos }
  await req.payload.update({
    collection: 'compromissos',
    req,
    where: where as never,
    data: { status: a.status, ...(a.status === 'cumprido' || a.status === 'retirado' ? { encerradoEm: new Date().toISOString() } : {}) },
  })
}
