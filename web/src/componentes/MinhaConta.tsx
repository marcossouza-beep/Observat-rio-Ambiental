'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Chips, SeletorUF } from './FormInscricao'
import { postar, useSessao } from './useSessao'

type Lei = { id: number; rotulo: string; titulo?: string; slug: string }
type Item = { id: number; nome: string }
type Parlamentar = { id: number; nome: string; partido?: string; uf?: string; slug: string }

export function MinhaConta({ subperfis, perguntas, temas, biomas }: { subperfis: Record<string, string[]>; perguntas: Record<string, string>; temas: Item[]; biomas: Item[] }) {
  const { sessao, recarregar } = useSessao()
  const router = useRouter()
  const [leis, setLeis] = useState<Lei[]>([])
  const [parlamentares, setParlamentares] = useState<Parlamentar[]>([])
  const [curso, setCurso] = useState('')
  const [confirmar, setConfirmar] = useState(false)
  // A chave muda na hora; o salvamento vem em seguida
  const [marcado, setMarcado] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (sessao && !sessao.logado) router.replace('/entrar?para=/conta')
    const ids = [...(sessao?.seguindo || []), ...(sessao?.avisar || [])]
    if (ids.length) {
      const q = ids.map((id, i) => `where[id][in][${i}]=${id}`).join('&')
      fetch(`/api/proposicoes?${q}&depth=0&limit=100&select[rotulo]=true&select[titulo]=true&select[slug]=true`)
        .then((r) => r.json())
        .then((j) => setLeis(j.docs || []))
        .catch(() => {})
    }
    const ps = sessao?.seguirParlamentares || []
    if (ps.length) {
      const q = ps.map((id, i) => `where[id][in][${i}]=${id}`).join('&')
      fetch(`/api/parlamentares?${q}&depth=0&limit=100&select[nome]=true&select[partido]=true&select[uf]=true&select[slug]=true`)
        .then((r) => r.json())
        .then((j) => setParlamentares(j.docs || []))
        .catch(() => {})
    }
  }, [sessao, router])

  if (!sessao?.logado) return <p className="nota-fonte">Carregando…</p>
  const falta = sessao.perfil === 'Estudante' ? !sessao.curso : !!subperfis[sessao.perfil || ''] && !sessao.subperfil
  const salvar = async (dados: Record<string, unknown>) => {
    await postar('/api/conta', dados)
    recarregar()
  }
  const chave = (k: 'alertas' | 'resumoSemanal' | 'aceitaEmails', titulo: string, desc: string) => (
    <label className="chave">
      <span>
        {titulo}
        <small>{desc}</small>
      </span>
      <input
        type="checkbox"
        checked={marcado[k] ?? !!sessao[k]}
        onChange={(e) => {
          setMarcado({ ...marcado, [k]: e.target.checked })
          salvar({ [k]: e.target.checked })
        }}
      />
    </label>
  )
  const seguindo = leis.filter((l) => sessao.seguindo?.includes(l.id))
  const seguidos = parlamentares.filter((p) => sessao.seguirParlamentares?.includes(p.id))
  const avisar = leis.filter((l) => sessao.avisar?.includes(l.id))

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <section className="caixa">
        <h2>{sessao.nome || sessao.email}</h2>
        <p className="nota-fonte">
          {sessao.email}
          {sessao.perfil ? ` · ${sessao.perfil}` : ''}
          {sessao.subperfil ? ` · ${sessao.subperfil}` : ''}
          {sessao.curso ? ` · ${sessao.curso}` : ''}
          {sessao.imprensa ? ` · Imprensa: ${sessao.imprensa === 'verificado' ? 'verificada' : 'em análise'}` : ''}
        </p>
        {falta ? (
          <div className="alerta">
            <b>Complete seu perfil</b> — ajuda a enviar só o que interessa a você.
            {sessao.perfil === 'Estudante' ? (
              <div className="linha-acoes" style={{ marginTop: 8 }}>
                <input className="campo" value={curso} onChange={(e) => setCurso(e.target.value)} placeholder="Seu curso" style={{ flex: 1, padding: 8, borderRadius: 999, border: '1px solid var(--line)' }} />
                <button type="button" className="pill-btn" onClick={() => curso.trim() && salvar({ curso })}>
                  Salvar
                </button>
              </div>
            ) : (
              <div className="opcoes" style={{ marginTop: 8 }}>
                <span style={{ width: '100%' }}>{perguntas[sessao.perfil || '']}</span>
                {(subperfis[sessao.perfil || ''] || []).map((s) => (
                  <button key={s} type="button" className="opcao" onClick={() => salvar({ subperfil: s })}>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </section>
      <section className="caixa">
        <h2>E-mails</h2>
        <div>
          {chave('aceitaEmails', 'Receber e-mails do observatório', 'Aviso no dia em que sai o parecer de uma lei que você segue ou pediu, e comunicados do autor')}
          {marcado.aceitaEmails ?? sessao.aceitaEmails ? (
            <>
              {chave('alertas', 'Alerta diário', 'No fim do dia, quando uma lei que você segue entrar na pauta, for votada, sancionada ou vetada')}
              {chave('resumoSemanal', 'Resumo semanal', 'Às sextas: pareceres da semana, o que vai a voto e o que andou nos seus temas, na sua região e com os parlamentares que você segue')}
            </>
          ) : (
            <p className="nota-fonte">Com os e-mails desligados, você não recebe alerta nem resumo.</p>
          )}
        </div>
      </section>
      <section className="caixa form">
        <h2>Seus interesses</h2>
        <p className="nota-fonte">Usados no resumo semanal (“Do seu interesse” e “Na sua região”). O estado define a edição regional do resumo (Norte, Nordeste, Centro-Oeste, Sudeste ou Sul); sem estado, vem a edição nacional.</p>
        <SeletorUF rotulo="Seu estado" valor={sessao.uf || ''} vazio="Prefiro não informar" mudar={(uf) => salvar({ uf })} />
        <Chips titulo="Temas" itens={temas} marcados={sessao.temas || []} alternar={(id) => salvar({ temas: (sessao.temas || []).includes(id) ? (sessao.temas || []).filter((x) => x !== id) : [...(sessao.temas || []), id] })} />
        <Chips titulo="Biomas" itens={biomas} marcados={sessao.biomas || []} alternar={(id) => salvar({ biomas: (sessao.biomas || []).includes(id) ? (sessao.biomas || []).filter((x) => x !== id) : [...(sessao.biomas || []), id] })} />
      </section>
      <section className="caixa">
        <h2>Parlamentares que você segue</h2>
        {seguidos.length ? (
          <ul style={{ paddingLeft: '1.1em', display: 'grid', gap: 6 }}>
            {seguidos.map((p) => (
              <li key={p.id}>
                <Link href={`/parlamentares/${p.slug}`}>
                  {p.nome}
                  {p.partido ? ` (${p.partido}${p.uf ? `-${p.uf}` : ''})` : ''}
                </Link>{' '}
                <button type="button" className="link-btn" onClick={async () => { await postar('/api/conta/seguir-parlamentar', { parlamentar: p.id, ligar: false }); recarregar() }}>
                  · deixar de seguir
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="nota-fonte">
            Use “Seguir” na página de um parlamentar (em <Link href="/parlamentares">Parlamentares</Link>). Os votos dele em propostas ambientais entram no seu resumo semanal.
          </p>
        )}
      </section>
      <section className="caixa">
        <h2>Leis que você segue</h2>
        {seguindo.length ? (
          <ul style={{ paddingLeft: '1.1em', display: 'grid', gap: 6 }}>
            {seguindo.map((l) => (
              <li key={l.id}>
                <Link href={`/leis/${l.slug}`}>
                  {l.rotulo} — {l.titulo}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="nota-fonte">Use “Seguir esta lei” na página de uma lei.</p>
        )}
        {avisar.length ? (
          <>
            <h3 style={{ fontSize: '1rem' }}>Aguardando parecer</h3>
            <ul style={{ paddingLeft: '1.1em', display: 'grid', gap: 6 }}>
              {avisar.map((l) => (
                <li key={l.id}>
                  <Link href={`/leis/${l.slug}`}>
                    {l.rotulo} — {l.titulo}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </section>
      <section className="caixa">
        <h2>Seus dados</h2>
        <div className="linha-acoes">
          {/* Download de arquivo (JSON), não é navegação entre páginas */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a className="link-oficial" href="/api/conta/dados">
            Baixar meus dados
          </a>
          <button
            type="button"
            className="link-btn"
            onClick={async () => {
              await postar('/api/sair', {})
              // Recarrega a página inteira para o cabeçalho esquecer a sessão
              // eslint-disable-next-line @next/next/no-location-assign-relative-destination
              window.location.assign('/')
            }}
          >
            Sair
          </button>
        </div>
        {confirmar ? (
          <div className="alerta">
            Excluir a inscrição apaga seus dados e preferências. Não dá para desfazer.{' '}
            <button
              type="button"
              className="pill-btn"
              style={{ background: 'var(--rose-ink)' }}
              onClick={async () => {
                await postar('/api/conta/excluir', {})
                // eslint-disable-next-line @next/next/no-location-assign-relative-destination
                window.location.assign('/?excluido=1')
              }}
            >
              Excluir de vez
            </button>
          </div>
        ) : (
          <button type="button" className="link-btn" style={{ color: 'var(--rose-ink)', justifySelf: 'start' }} onClick={() => setConfirmar(true)}>
            Excluir minha inscrição
          </button>
        )}
      </section>
    </div>
  )
}
