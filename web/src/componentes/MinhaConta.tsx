'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { postar, useSessao } from './useSessao'

type Lei = { id: number; rotulo: string; titulo?: string; slug: string }

export function MinhaConta({ subperfis, perguntas }: { subperfis: Record<string, string[]>; perguntas: Record<string, string> }) {
  const { sessao, recarregar } = useSessao()
  const router = useRouter()
  const [leis, setLeis] = useState<Lei[]>([])
  const [curso, setCurso] = useState('')
  const [confirmar, setConfirmar] = useState(false)

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
      <input type="checkbox" checked={!!sessao[k]} onChange={(e) => salvar({ [k]: e.target.checked })} />
    </label>
  )
  const seguindo = leis.filter((l) => sessao.seguindo?.includes(l.id))
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
        <h2>Avisos por e-mail</h2>
        <div>
          {chave('aceitaEmails', 'Receber e-mails do observatório', 'Aviso no dia em que sai o parecer de uma lei que você segue ou pediu, e comunicados do autor')}
        </div>
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
