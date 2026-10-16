import type { AdminViewServerProps } from 'payload'
import { calcularPrazo } from '../lib/compromissos'
import { sugerirClassificacao } from '../lib/relevancia'
import { chave } from '../lib/datas'
import { regrasDePrazoDe } from './regras'
import { AcoesTriagem } from './AcoesTriagem'
import { Moldura } from './Moldura'
import { ADMIN, Chip, dataCurta, Destacar, linkDoc } from './util'

/** Triagem: propostas captadas, da mais relevante para a menos (docs/TELAS.md, B2). */
export async function Triagem(props: AdminViewServerProps) {
  const payload = props.initPageResult.req.payload
  const esfera = typeof props.searchParams?.esfera === 'string' ? props.searchParams.esfera : ''
  const [lista, abertos, ajustes, dic, temas, biomas] = await Promise.all([
    payload.find({
      collection: 'proposicoes',
      where: { situacaoEditorial: { equals: 'triagem' }, ...(esfera ? { esfera: { equals: esfera } } : {}) },
      sort: '-relevancia',
      limit: 100,
      depth: 0,
    }),
    payload.count({ collection: 'compromissos', where: { tipo: { equals: 'parecer_prometido' }, status: { in: ['aberto', 'suspenso'] } } }),
    payload.findGlobal({ slug: 'ajustes', depth: 0 }),
    payload.find({ collection: 'palavras-chave', limit: 3000, depth: 0, pagination: false, select: { termo: true, grupo: true, peso: true } }),
    payload.find({ collection: 'temas', limit: 100, depth: 0, pagination: false, select: { nome: true } }),
    payload.find({ collection: 'biomas', limit: 100, depth: 0, pagination: false, select: { nome: true } }),
  ])
  const opcoes = { temas: temas.docs.map((t) => ({ id: t.id, nome: t.nome })), biomas: biomas.docs.map((b) => ({ id: b.id, nome: b.nome })) }
  const ids = (v: unknown) => (Array.isArray(v) ? v.map((x) => (typeof x === 'object' && x ? (x as { id: number }).id : (x as number))) : [])
  const limite = ajustes.limitePrometidos || 10
  const prazoPadrao = chave(calcularPrazo('parecer_prometido', new Date(), regrasDePrazoDe(ajustes)))
  return (
    <Moldura props={props} titulo="Triagem" sub="Propostas captadas pelas palavras-chave. Você decide o que vira parecer.">
      <div className="obs-faixa">
        <span>Pareceres prometidos em aberto</span>
        <span className="obs-barra pequena">
          <i style={{ width: `${Math.min(100, (abertos.totalDocs / limite) * 100)}%` }} className={abertos.totalDocs >= limite ? 'r' : ''} />
        </span>
        <b>
          {abertos.totalDocs} de {limite}
        </b>
        <span className="obs-filtros">
          {[
            ['', 'Todas'],
            ['federal', 'Federais'],
            ['estadual', 'Estaduais'],
          ].map(([v, t]) => (
            <a key={t} href={`${ADMIN}/triagem${v ? `?esfera=${v}` : ''}`} aria-current={esfera === v ? 'true' : undefined}>
              {t}
            </a>
          ))}
        </span>
      </div>
      <section className="obs-card">
        {lista.docs.length ? (
          lista.docs.map((p) => {
            const nota = p.relevancia ?? 0
            // Áreas e biomas pelos termos encontrados (grupo da palavra-chave), menos os que a proposta já tem
            const sug = sugerirClassificacao(p.termosEncontrados, dic.docs, opcoes)
            const jaTemas = ids(p.temas)
            const jaBiomas = ids(p.biomas)
            return (
              <div key={p.id} className="obs-tri">
                <span className={`obs-nota-rel ${nota >= 75 ? 'g' : nota >= 50 ? 'y' : ''}`} title="Nota de relevância">
                  {nota}
                </span>
                <div>
                  <div className="obs-meta-linha">
                    <a href={linkDoc('proposicoes', p.id)}>
                      <b>{p.rotulo}</b>
                    </a>
                    <span>{p.esfera === 'federal' ? 'Federal' : p.uf}</span>
                    <span>captada em {dataCurta(p.createdAt)}</span>
                  </div>
                  <p>
                    <Destacar texto={p.ementa || p.titulo || ''} termos={p.termosEncontrados} />
                  </p>
                  {nota < 25 ? <Chip cor="y">Nota baixa: confira se é homenagem ou data comemorativa</Chip> : null}
                </div>
                <AcoesTriagem
                  id={p.id}
                  rotulo={p.rotulo || ''}
                  prazoPadrao={prazoPadrao}
                  abertos={abertos.totalDocs}
                  limite={limite}
                  classificacao={{
                    temas: jaTemas,
                    biomas: jaBiomas,
                    sugeridos: [
                      ...sug.temas.filter((t) => !jaTemas.includes(t.id)).map((t) => ({ tipo: 'temas' as const, id: t.id, nome: t.nome })),
                      ...sug.biomas.filter((b) => !jaBiomas.includes(b.id)).map((b) => ({ tipo: 'biomas' as const, id: b.id, nome: b.nome })),
                    ],
                  }}
                />
              </div>
            )
          })
        ) : (
          <p className="obs-vazio">Nada novo na triagem.</p>
        )}
      </section>
      <p className="obs-nota">
        Ativar põe na página pública o aviso “Parecer em preparação” com prazo. Acompanhar mostra “Acompanhando”, sem prometer parecer. Descartar não publica nada; o
        motivo fica registrado para ajustar as palavras-chave. As áreas e os biomas sugeridos (pelos termos encontrados) vão junto ao ativar ou acompanhar; desmarque o
        que não couber.
      </p>
    </Moldura>
  )
}
