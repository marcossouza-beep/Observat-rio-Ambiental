'use client'
import Link from 'next/link'
import { useState } from 'react'
import { postar } from './useSessao'

type Item = { id: number; nome: string }
type Props = { perfis: readonly string[]; subperfis: Record<string, string[]>; temas: Item[]; biomas: Item[]; para?: string; prazoImprensa: number }

const DESC: Record<string, string> = {
  'Advogado(a)': 'Atuação jurídica e consultoria',
  Estudante: 'Informe curso e estado',
  'Servidor(a) público(a)': 'Órgãos ambientais, MP, Judiciário, Legislativo',
  Empresa: 'Setor produtivo e consultorias',
  'ONG / movimento': 'Sociedade civil organizada',
  'Pesquisador(a)': 'Universidades e institutos',
  Jornalista: 'Inclui credenciamento de imprensa',
  'Cidadão(ã)': 'Quero acompanhar as leis',
}
const PERGUNTA: Record<string, string> = {
  'Advogado(a)': 'Onde você atua?',
  'Servidor(a) público(a)': 'Em que órgão?',
  Empresa: 'Em que setor?',
  'ONG / movimento': 'Qual o foco?',
  'Pesquisador(a)': 'Em que área?',
  'Cidadão(ã)': 'O que mais descreve você?',
}
const CURSOS = ['Direito', 'Engenharia Ambiental', 'Ciências Biológicas', 'Agronomia', 'Gestão Ambiental', 'Engenharia Florestal', 'Geografia', 'Oceanografia']
const UFS = 'AC AL AM AP BA CE DF ES GO MA MG MS MT PA PB PE PI PR RJ RN RO RR RS SC SE SP TO'.split(' ')

export function FormInscricao({ perfis, subperfis, temas, biomas, para, prazoImprensa }: Props) {
  const [passo, setPasso] = useState(0)
  const [d, setD] = useState({ nome: '', email: '', perfil: '', subperfil: '', curso: '', uf: '', temas: [] as number[], biomas: [] as number[], alertas: true, resumoSemanal: true, consentimento: false })
  const [imp, setImp] = useState({ veiculo: '', tipo: '', funcao: '', link: '', emailProfissional: '', mtb: '', autoriza: false })
  const [erro, setErro] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const jornalista = d.perfil === 'Jornalista'
  const passos = ['voce', 'perfil', ...(jornalista ? ['imprensa'] : []), 'interesses', 'avisos']
  const atual = passos[passo]
  const alternar = (k: 'temas' | 'biomas', id: number) => setD({ ...d, [k]: d[k].includes(id) ? d[k].filter((x) => x !== id) : [...d[k], id] })

  function validar(): string {
    if (atual === 'voce' && (!d.nome.trim() || !/^\S+@\S+\.\S+$/.test(d.email))) return 'Preencha seu nome e um e-mail válido.'
    if (atual === 'perfil') {
      if (!d.perfil) return 'Escolha o que melhor descreve você.'
      if (d.perfil === 'Estudante' && (!d.curso.trim() || !d.uf)) return 'Informe seu curso e o estado onde mora.'
      if (subperfis[d.perfil] && !d.subperfil) return `${PERGUNTA[d.perfil].replace('?', '')}: escolha uma opção.`
    }
    if (atual === 'imprensa' && (!imp.veiculo.trim() || !imp.link.trim() || !imp.autoriza)) return 'Informe o veículo, um link de comprovação e autorize a verificação.'
    if (atual === 'avisos' && !d.consentimento) return 'Marque a concordância com a Política de Privacidade.'
    return ''
  }

  async function avancar(e: React.FormEvent) {
    e.preventDefault()
    const v = validar()
    if (v) return setErro(v)
    setErro('')
    if (passo < passos.length - 1) return setPasso(passo + 1)
    setEnviando(true)
    const r = await postar('/api/inscricao', { ...d, imprensa: jornalista ? imp : undefined, para, site: (e.currentTarget as HTMLFormElement).querySelector<HTMLInputElement>('[name=site]')?.value })
    setEnviando(false)
    if (r.ok) setEnviado(true)
    else setErro(r.erro || 'Não foi possível concluir agora. Tente de novo.')
  }

  if (enviado)
    return (
      <div className="caixa">
        <h2>Confira seu e-mail</h2>
        <p>
          Enviamos um link para <b>{d.email}</b>. Clique nele para confirmar a inscrição e entrar. O link vale por 1 hora.
        </p>
        {jornalista ? <p className="nota-fonte">Seu pedido de credenciamento de imprensa foi registrado. A verificação leva até {prazoImprensa} dias úteis.</p> : null}
        <p className="nota-fonte">Não chegou? Veja a caixa de spam ou <Link href="/entrar">peça outro link</Link>.</p>
      </div>
    )

  return (
    <form className="caixa form" onSubmit={avancar} noValidate>
      <div className="passos" aria-hidden="true">
        {passos.map((p, i) => (
          <span key={p} className={i <= passo ? 'on' : ''} />
        ))}
      </div>
      <input className="oculto" name="site" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      {atual === 'voce' ? (
        <>
          <h2>Vamos começar</h2>
          <label className="campo">
            Nome
            <input value={d.nome} onChange={(e) => setD({ ...d, nome: e.target.value })} autoComplete="name" placeholder="Como podemos te chamar?" />
          </label>
          <label className="campo">
            E-mail
            <input type="email" inputMode="email" value={d.email} onChange={(e) => setD({ ...d, email: e.target.value })} autoComplete="email" placeholder="voce@exemplo.com" />
          </label>
        </>
      ) : null}
      {atual === 'perfil' ? (
        <>
          <h2>Você é…</h2>
          <div className="cartoes" role="radiogroup" aria-label="Perfil">
            {perfis.map((p) => (
              <button key={p} type="button" role="radio" aria-checked={d.perfil === p} className="cartao" onClick={() => setD({ ...d, perfil: p, subperfil: '' })}>
                <b>{p}</b>
                <span>{DESC[p]}</span>
              </button>
            ))}
          </div>
          {d.perfil === 'Estudante' ? (
            <>
              <label className="campo">
                Curso
                <input list="cursos" value={d.curso} onChange={(e) => setD({ ...d, curso: e.target.value })} placeholder="Ex.: Direito" />
                <datalist id="cursos">
                  {CURSOS.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </label>
              <label className="campo">
                Estado onde você mora
                <select value={d.uf} onChange={(e) => setD({ ...d, uf: e.target.value })}>
                  <option value="">Escolha</option>
                  {UFS.map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
              </label>
            </>
          ) : subperfis[d.perfil] ? (
            <div className="campo">
              {PERGUNTA[d.perfil]}
              <div className="opcoes">
                {subperfis[d.perfil].map((s) => (
                  <button key={s} type="button" className="opcao" aria-pressed={d.subperfil === s} onClick={() => setD({ ...d, subperfil: s })}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : jornalista ? (
            <p className="nota-fonte">No próximo passo: credenciamento de imprensa.</p>
          ) : null}
        </>
      ) : null}
      {atual === 'imprensa' ? (
        <>
          <h2>Credenciamento de imprensa</h2>
          <p className="nota-fonte">Libera pareceres antes da publicação (sob embargo) e contato direto com o autor. Verificamos em até {prazoImprensa} dias úteis.</p>
          <label className="campo">
            Veículo *
            <input value={imp.veiculo} onChange={(e) => setImp({ ...imp, veiculo: e.target.value })} autoComplete="organization" />
          </label>
          <label className="campo">
            Função
            <input value={imp.funcao} onChange={(e) => setImp({ ...imp, funcao: e.target.value })} placeholder="Repórter, editor(a)…" />
          </label>
          <label className="campo">
            Link de comprovação *<small>Página de autor, matéria assinada ou perfil profissional</small>
            <input value={imp.link} onChange={(e) => setImp({ ...imp, link: e.target.value })} inputMode="url" />
          </label>
          <label className="campo">
            E-mail profissional<small>Do domínio do veículo, se tiver (agiliza a verificação)</small>
            <input type="email" value={imp.emailProfissional} onChange={(e) => setImp({ ...imp, emailProfissional: e.target.value })} />
          </label>
          <label className="campo">
            Registro MTb
            <input value={imp.mtb} onChange={(e) => setImp({ ...imp, mtb: e.target.value })} />
          </label>
          <label className="check">
            <input type="checkbox" checked={imp.autoriza} onChange={(e) => setImp({ ...imp, autoriza: e.target.checked })} /> Autorizo a verificação destas informações.
          </label>
        </>
      ) : null}
      {atual === 'interesses' ? (
        <>
          <h2>O que você quer acompanhar</h2>
          {d.perfil !== 'Estudante' ? (
            <label className="campo">
              Seu estado
              <select value={d.uf} onChange={(e) => setD({ ...d, uf: e.target.value })}>
                <option value="">Prefiro não informar</option>
                {UFS.map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
            </label>
          ) : null}
          <div className="campo">
            Temas
            <div className="opcoes">
              {temas.map((t) => (
                <button key={t.id} type="button" className="opcao" aria-pressed={d.temas.includes(t.id)} onClick={() => alternar('temas', t.id)}>
                  {t.nome}
                </button>
              ))}
            </div>
          </div>
          <div className="campo">
            Biomas
            <div className="opcoes">
              {biomas.map((b) => (
                <button key={b.id} type="button" className="opcao" aria-pressed={d.biomas.includes(b.id)} onClick={() => alternar('biomas', b.id)}>
                  {b.nome}
                </button>
              ))}
            </div>
          </div>
        </>
      ) : null}
      {atual === 'avisos' ? (
        <>
          <h2>Quase pronto</h2>
          <p className="nota-fonte">Você recebe um e-mail no dia em que sair o parecer de uma lei que você segue ou pediu para ser avisado, e os comunicados do observatório. Dá para parar com um clique, em qualquer e-mail.</p>
          <label className="check">
            <input type="checkbox" checked={d.consentimento} onChange={(e) => setD({ ...d, consentimento: e.target.checked })} /> Li e concordo com a{' '}
            <Link href="/privacidade" target="_blank">
              Política de Privacidade
            </Link>
            .
          </label>
        </>
      ) : null}
      {erro ? <p className="erro">{erro}</p> : null}
      <div className="linha-acoes">
        {passo > 0 ? (
          <button type="button" className="link-btn" onClick={() => setPasso(passo - 1)}>
            ← Voltar
          </button>
        ) : (
          <span />
        )}
        <button className="pill-btn" type="submit" disabled={enviando}>
          {passo < passos.length - 1 ? 'Continuar' : 'Concluir inscrição'}
        </button>
      </div>
    </form>
  )
}
