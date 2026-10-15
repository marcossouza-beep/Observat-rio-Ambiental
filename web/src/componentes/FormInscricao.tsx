'use client'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { postar } from './useSessao'
import { SetaEsq } from './Icones'
import { Bandeira } from './Etiquetas'
import { NOME_SITE, UF_NOME } from '@/lib/rotulos'
import { sugerirEmail } from '@/lib/digitacao'

type Item = { id: number; nome: string }
type Props = { perfis: readonly string[]; subperfis: Record<string, string[]>; temas: Item[]; biomas: Item[]; para?: string; prazoImprensa: number }

const DESC: Record<string, string> = {
  'Advogado(a)': 'Atuação jurídica e consultoria',
  Estudante: 'Informe curso e estado',
  'Servidor(a) público(a)': 'Órgãos ambientais, MP, Judiciário, Legislativo',
  Empresa: 'Setor produtivo e consultorias',
  'ONG / movimento': 'Sociedade civil organizada',
  'Pesquisador(a)': 'Universidades e institutos',
  Jornalista: 'Com verificação do veículo',
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
const UFS = Object.keys(UF_NOME).sort((a, b) => UF_NOME[a].localeCompare(UF_NOME[b], 'pt-BR'))
const NOME_PASSO: Record<string, string> = { voce: 'Você', perfil: 'Perfil', imprensa: 'Imprensa', interesses: 'Interesses', avisos: 'Confirmação' }

function Check() {
  return (
    <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  )
}

export function SeletorUF({ rotulo, valor, vazio, mudar }: { rotulo: string; valor: string; vazio: string; mudar: (uf: string) => void }) {
  return (
    <label className="campo">
      {rotulo}
      <span className="uf-sel">
        {valor ? <Bandeira uf={valor} /> : <span className="flag sem" />}
        <select value={valor} onChange={(e) => mudar(e.target.value)}>
          <option value="">{vazio}</option>
          {UFS.map((u) => (
            <option key={u} value={u}>
              {UF_NOME[u]}
            </option>
          ))}
        </select>
      </span>
    </label>
  )
}

export function Chips({ titulo, itens, marcados, alternar }: { titulo: string; itens: Item[]; marcados: number[]; alternar: (id: number) => void }) {
  return (
    <div className="campo">
      <span className="campo-topo">
        {titulo}
        <small>{marcados.length ? `${marcados.length} escolhido${marcados.length > 1 ? 's' : ''}` : 'Opcional'}</small>
      </span>
      <div className="opcoes">
        {itens.map((t) => (
          <button key={t.id} type="button" className="opcao" aria-pressed={marcados.includes(t.id)} onClick={() => alternar(t.id)}>
            {t.nome}
          </button>
        ))}
      </div>
    </div>
  )
}

export function FormInscricao({ perfis, subperfis, temas, biomas, para, prazoImprensa }: Props) {
  const [passo, setPasso] = useState(0)
  const [d, setD] = useState({ nome: '', email: '', perfil: '', subperfil: '', curso: '', uf: '', temas: [] as number[], biomas: [] as number[], alertas: true, resumoSemanal: true, consentimento: false })
  const [imp, setImp] = useState({ veiculo: '', tipo: '', funcao: '', link: '', emailProfissional: '', mtb: '', autoriza: false })
  const [erro, setErro] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [trocarPerfil, setTrocarPerfil] = useState(false)
  const [emailVisto, setEmailVisto] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const tituloRef = useRef<HTMLHeadingElement>(null)
  const seguinteRef = useRef<HTMLDivElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const anterior = useRef({ passo, enviado })

  const jornalista = d.perfil === 'Jornalista'
  const passos = ['voce', 'perfil', ...(jornalista ? ['imprensa'] : []), 'interesses', 'avisos']
  const atual = passos[passo]
  const ultimo = passo === passos.length - 1
  const sugestao = emailVisto ? sugerirEmail(d.email) : null
  const alternar = (k: 'temas' | 'biomas', id: number) => setD({ ...d, [k]: d[k].includes(id) ? d[k].filter((x) => x !== id) : [...d[k], id] })

  // A cada passo (ou ao concluir): leva o topo do formulário à tela e o foco ao título.
  useEffect(() => {
    if (anterior.current.passo === passo && anterior.current.enviado === enviado) return
    anterior.current = { passo, enviado }
    const f = formRef.current
    const celular = window.matchMedia('(max-width: 640px)').matches
    if (f && (celular || f.getBoundingClientRect().top < 72)) f.scrollIntoView({ block: 'start' })
    tituloRef.current?.focus({ preventScroll: true })
  }, [passo, enviado])

  function escolherPerfil(p: string) {
    setD({ ...d, perfil: p, subperfil: d.perfil === p ? d.subperfil : '' })
    setTrocarPerfil(false)
    setErro('')
    // No celular, a pergunta seguinte aparece abaixo da escolha: rola até ela.
    requestAnimationFrame(() => seguinteRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }))
  }

  function irPara(nome: string) {
    setErro('')
    setPasso(passos.indexOf(nome))
  }

  function validar(): string {
    if (atual === 'voce') {
      if (!d.nome.trim()) return 'Informe seu nome.'
      if (!/^\S+@\S+\.\S+$/.test(d.email.trim())) return 'Informe um e-mail válido.'
    }
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
    if (!ultimo) return setPasso(passo + 1)
    setEnviando(true)
    const site = formRef.current?.querySelector<HTMLInputElement>('[name=site]')?.value
    const r = await postar('/api/inscricao', { ...d, email: d.email.trim(), imprensa: jornalista ? imp : undefined, para, site })
    setEnviando(false)
    if (r.ok) setEnviado(true)
    else setErro(r.erro || 'Não foi possível concluir agora. Tente de novo.')
  }

  if (enviado)
    return (
      <div className="caixa form inscricao-ok">
        <span className="selo" aria-hidden="true">
          <svg className="ico" viewBox="0 0 24 24">
            <rect x="3" y="5" width="18" height="14" rx="2.5" />
            <path d="m4 7 8 6 8-6" />
          </svg>
        </span>
        <h2 ref={tituloRef} tabIndex={-1}>
          Confira seu e-mail
        </h2>
        <p>
          Enviamos um link para <b className="quebra">{d.email.trim()}</b>. Toque nele para confirmar a inscrição e entrar. O link vale por 1 hora.
        </p>
        <ol className="dicas">
          <li>Abra o e-mail de {NOME_SITE}.</li>
          <li>Toque no botão do e-mail para entrar.</li>
          <li>Pronto: notas técnicas e quadros liberados.</li>
        </ol>
        {jornalista ? <p className="alerta">Seu pedido de credenciamento de imprensa foi registrado. A verificação leva até {prazoImprensa} dias úteis.</p> : null}
        <p className="nota-fonte">
          Não chegou? Veja a caixa de spam ou <Link href="/entrar">peça outro link</Link>.
        </p>
        <button
          type="button"
          className="link-btn"
          onClick={() => {
            setEnviado(false)
            setD({ ...d, consentimento: false })
            setPasso(0)
          }}
        >
          Errou o e-mail? Corrigir
        </button>
      </div>
    )

  const titulo: Record<string, string> = { voce: 'Vamos começar', perfil: 'Você é…', imprensa: 'Credenciamento de imprensa', interesses: 'O que você quer acompanhar', avisos: 'Quase pronto' }
  const subRotulo = [d.subperfil, d.perfil === 'Estudante' ? d.curso.trim() : ''].filter(Boolean).join(' · ')

  return (
    <form ref={formRef} className="caixa form inscricao-form" onSubmit={avancar} noValidate>
      <div className="passo-topo">
        <div className="passos" aria-hidden="true">
          {passos.map((p, i) => (
            <span key={p} className={i <= passo ? 'on' : ''} />
          ))}
        </div>
        <p className="passo-n">
          Passo {passo + 1} de {passos.length} · {NOME_PASSO[atual]}
        </p>
      </div>
      <input className="oculto" name="site" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <h2 ref={tituloRef} tabIndex={-1}>
        {titulo[atual]}
      </h2>

      {atual === 'voce' ? (
        <>
          <ul className="beneficios">
            <li className="lead">O parecer é aberto a todos. Inscritos também têm:</li>
            <li>
              <Check /> Notas técnicas e quadros comparativos em PDF
            </li>
            <li>
              <Check /> Aviso por e-mail no dia em que sai o parecer
            </li>
            <li>
              <Check /> Grátis, sem senha, cancele com um clique
            </li>
          </ul>
          <label className="campo">
            Nome
            <input
              value={d.nome}
              onChange={(e) => setD({ ...d, nome: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  emailRef.current?.focus()
                }
              }}
              autoComplete="name"
              autoCapitalize="words"
              enterKeyHint="next"
              placeholder="Como podemos te chamar?"
            />
          </label>
          <label className="campo">
            E-mail
            <input
              ref={emailRef}
              type="email"
              inputMode="email"
              value={d.email}
              onChange={(e) => setD({ ...d, email: e.target.value })}
              onBlur={() => setEmailVisto(true)}
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="next"
              placeholder="voce@exemplo.com"
            />
            {sugestao ? (
              <button type="button" className="sugestao" onClick={() => setD({ ...d, email: sugestao })}>
                Você quis dizer <b>{sugestao}</b>?
              </button>
            ) : (
              <small>É para lá que vai o link de acesso. Sem senha.</small>
            )}
          </label>
        </>
      ) : null}

      {atual === 'perfil' ? (
        <>
          {d.perfil && !trocarPerfil ? (
            <div className="escolhido">
              <span>
                <small>Perfil escolhido</small>
                <b>{d.perfil}</b>
              </span>
              <button type="button" className="link-btn" onClick={() => setTrocarPerfil(true)}>
                Trocar
              </button>
            </div>
          ) : (
            <div className="cartoes" role="radiogroup" aria-label="Perfil">
              {perfis.map((p) => (
                <button key={p} type="button" role="radio" aria-checked={d.perfil === p} className="cartao" onClick={() => escolherPerfil(p)}>
                  <span className="cartao-txt">
                    <b>{p}</b>
                    <small>{DESC[p]}</small>
                  </span>
                  <span className="marca" aria-hidden="true" />
                </button>
              ))}
            </div>
          )}
          <div ref={seguinteRef} className="form">
            {trocarPerfil ? null : d.perfil === 'Estudante' ? (
              <>
                <label className="campo">
                  Curso
                  <input list="cursos" value={d.curso} onChange={(e) => setD({ ...d, curso: e.target.value })} autoCapitalize="words" enterKeyHint="next" placeholder="Ex.: Direito" />
                  <datalist id="cursos">
                    {CURSOS.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </label>
                <SeletorUF rotulo="Estado onde você mora" valor={d.uf} vazio="Escolha o estado" mudar={(uf) => setD({ ...d, uf })} />
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
              <p className="alerta">No próximo passo: dados do veículo, para verificarmos seu credenciamento de imprensa.</p>
            ) : null}
          </div>
        </>
      ) : null}

      {atual === 'imprensa' ? (
        <>
          <p className="nota-fonte">Confirmamos seu vínculo com o veículo em até {prazoImprensa} dias úteis. Depois disso, sua conta aparece como imprensa verificada.</p>
          <label className="campo">
            Veículo *
            <input value={imp.veiculo} onChange={(e) => setImp({ ...imp, veiculo: e.target.value })} autoComplete="organization" enterKeyHint="next" />
          </label>
          <label className="campo">
            Função
            <input value={imp.funcao} onChange={(e) => setImp({ ...imp, funcao: e.target.value })} autoComplete="organization-title" enterKeyHint="next" placeholder="Repórter, editor(a)…" />
          </label>
          <label className="campo">
            Link de comprovação *<small>Página de autor, matéria assinada ou perfil profissional</small>
            <input type="url" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={imp.link} onChange={(e) => setImp({ ...imp, link: e.target.value })} enterKeyHint="next" placeholder="https://" />
          </label>
          <label className="campo">
            E-mail profissional<small>Do domínio do veículo, se tiver (agiliza a verificação)</small>
            <input type="email" inputMode="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={imp.emailProfissional} onChange={(e) => setImp({ ...imp, emailProfissional: e.target.value })} enterKeyHint="next" />
          </label>
          <label className="campo">
            Registro MTb
            <input value={imp.mtb} onChange={(e) => setImp({ ...imp, mtb: e.target.value })} enterKeyHint="next" />
          </label>
          <label className="check destaque">
            <input type="checkbox" checked={imp.autoriza} onChange={(e) => setImp({ ...imp, autoriza: e.target.checked })} /> <span>Autorizo a verificação destas informações.</span>
          </label>
        </>
      ) : null}

      {atual === 'interesses' ? (
        <>
          <p className="nota-fonte">Tudo opcional. Escolha quantos quiser.</p>
          {d.perfil !== 'Estudante' ? <SeletorUF rotulo="Seu estado" valor={d.uf} vazio="Prefiro não informar" mudar={(uf) => setD({ ...d, uf })} /> : null}
          <Chips titulo="Temas" itens={temas} marcados={d.temas} alternar={(id) => alternar('temas', id)} />
          <Chips titulo="Biomas" itens={biomas} marcados={d.biomas} alternar={(id) => alternar('biomas', id)} />
        </>
      ) : null}

      {atual === 'avisos' ? (
        <>
          <dl className="resumo">
            <div>
              <dt>Nome</dt>
              <dd>{d.nome.trim()}</dd>
              <button type="button" className="link-btn" aria-label="Editar nome e e-mail" onClick={() => irPara('voce')}>
                Editar
              </button>
            </div>
            <div>
              <dt>E-mail</dt>
              <dd className="quebra">{d.email.trim()}</dd>
            </div>
            <div>
              <dt>Perfil</dt>
              <dd>
                {d.perfil}
                {subRotulo ? <small>{subRotulo}</small> : null}
              </dd>
              <button type="button" className="link-btn" aria-label="Editar perfil" onClick={() => irPara('perfil')}>
                Editar
              </button>
            </div>
            {jornalista ? (
              <div>
                <dt>Imprensa</dt>
                <dd>{imp.veiculo.trim()}</dd>
                <button type="button" className="link-btn" aria-label="Editar credenciamento" onClick={() => irPara('imprensa')}>
                  Editar
                </button>
              </div>
            ) : null}
            <div>
              <dt>Interesses</dt>
              <dd>
                {[d.uf ? UF_NOME[d.uf] : '', d.temas.length ? `${d.temas.length} tema${d.temas.length > 1 ? 's' : ''}` : '', d.biomas.length ? `${d.biomas.length} bioma${d.biomas.length > 1 ? 's' : ''}` : '']
                  .filter(Boolean)
                  .join(' · ') || 'Nenhum escolhido'}
              </dd>
              <button type="button" className="link-btn" aria-label="Editar interesses" onClick={() => irPara('interesses')}>
                Editar
              </button>
            </div>
          </dl>
          <div className="campo">
            O que você quer receber por e-mail
            <label className="chave">
              <span>
                Alerta diário
                <small>No fim do dia, quando uma lei que você segue entrar na pauta, for votada, sancionada ou vetada</small>
              </span>
              <input type="checkbox" checked={d.alertas} onChange={(e) => setD({ ...d, alertas: e.target.checked })} />
            </label>
            <label className="chave">
              <span>
                Resumo semanal
                <small>Às sextas: pareceres da semana, o que vai a voto e o que andou nos seus temas, na edição da sua região</small>
              </span>
              <input type="checkbox" checked={d.resumoSemanal} onChange={(e) => setD({ ...d, resumoSemanal: e.target.checked })} />
            </label>
          </div>
          <p className="nota-fonte">Você também recebe o aviso no dia em que sair o parecer de uma lei que você segue ou pediu, e os comunicados do observatório. Dá para mudar em Minha conta e parar com um clique, em qualquer e-mail.</p>
          <label className="check destaque">
            <input type="checkbox" checked={d.consentimento} onChange={(e) => setD({ ...d, consentimento: e.target.checked })} />{' '}
            <span>
              Li e concordo com a{' '}
              <Link href="/privacidade" target="_blank">
                Política de Privacidade
              </Link>
              .
            </span>
          </label>
        </>
      ) : null}

      <div className="barra-acoes">
        {erro ? (
          <p className="erro" role="alert">
            {erro}
          </p>
        ) : null}
        <div className="linha-acoes">
          {passo > 0 ? (
            <button type="button" className="voltar" onClick={() => irPara(passos[passo - 1])}>
              <SetaEsq /> Voltar
            </button>
          ) : null}
          <button className="pill-btn grande" type="submit" disabled={enviando}>
            {enviando ? 'Enviando…' : ultimo ? 'Concluir inscrição' : 'Continuar'}
          </button>
        </div>
      </div>
    </form>
  )
}
