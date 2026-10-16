'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Sugerido = { tipo: 'temas' | 'biomas'; id: number; nome: string }
type Classificacao = { temas: number[]; biomas: number[]; sugeridos: Sugerido[] }
type Props = { id: number | string; rotulo: string; prazoPadrao: string; abertos: number; limite: number; classificacao?: Classificacao }

const MOTIVOS = ['Fora do tema', 'Homenagem ou data', 'Duplicada', 'Outro']

export function AcoesTriagem({ id, rotulo, prazoPadrao, abertos, limite, classificacao }: Props) {
  const router = useRouter()
  const [modo, setModo] = useState<'' | 'ativar' | 'descartar'>('')
  const [prazo, setPrazo] = useState(prazoPadrao)
  const [motivo, setMotivo] = useState(MOTIVOS[0])
  const [mesmoAssim, setMesmoAssim] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const lotado = abertos >= limite
  // Sugestões já marcadas; o autor desmarca o que não couber. Vão junto ao ativar ou acompanhar.
  const sugeridos = classificacao?.sugeridos || []
  const [marcados, setMarcados] = useState<string[]>(sugeridos.map((s) => `${s.tipo}:${s.id}`))
  const classificar = () => {
    if (!classificacao || !sugeridos.length) return {}
    const de = (tipo: Sugerido['tipo']) => sugeridos.filter((s) => s.tipo === tipo && marcados.includes(`${tipo}:${s.id}`)).map((s) => s.id)
    return { temas: [...classificacao.temas, ...de('temas')], biomas: [...classificacao.biomas, ...de('biomas')] }
  }
  const chips = sugeridos.length ? (
    <div className="obs-sugeridos" role="group" aria-label="Áreas e biomas sugeridos">
      <span className="obs-nota">Sugeridos pelos termos:</span>
      {sugeridos.map((s) => {
        const k = `${s.tipo}:${s.id}`
        const on = marcados.includes(k)
        return (
          <button
            key={k}
            type="button"
            className={`obs-chip ${on ? (s.tipo === 'temas' ? 'g' : 'b') : ''}`}
            aria-pressed={on}
            title={s.tipo === 'temas' ? 'Área' : 'Bioma'}
            onClick={() => setMarcados((m) => (on ? m.filter((x) => x !== k) : [...m, k]))}
          >
            {on ? '✓ ' : ''}
            {s.nome}
          </button>
        )
      })}
    </div>
  ) : null

  async function salvar(dados: Record<string, unknown>) {
    setSalvando(true)
    setErro('')
    const r = await fetch(`/api/proposicoes/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    })
    setSalvando(false)
    if (!r.ok) {
      const j = await r.json().catch(() => ({}))
      setErro(j?.errors?.[0]?.message || `Erro ${r.status}`)
      return
    }
    setModo('')
    router.refresh()
  }

  if (modo === 'ativar')
    return (
      <div className="obs-acoes coluna" role="group" aria-label={`Ativar parecer de ${rotulo}`}>
        {chips}
        <label>
          Publicar até (sugerido: 4 dias depois que a proposta saiu)
          <input type="date" value={prazo} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setPrazo(e.target.value)} />
        </label>
        {lotado ? (
          <label className="obs-alerta">
            <input type="checkbox" checked={mesmoAssim} onChange={(e) => setMesmoAssim(e.target.checked)} /> Já são {abertos} prometidos (limite {limite}). Ativar mesmo assim?
          </label>
        ) : (
          <span className="obs-nota">
            Ficará com {abertos + 1} de {limite} em aberto.
          </span>
        )}
        <span className="obs-nota">A página pública passa a mostrar “Parecer em preparação… nos próximos dias”.</span>
        <div className="obs-acoes">
          <button type="button" className="obs-btn p" disabled={salvando || !prazo || (lotado && !mesmoAssim)} onClick={() => salvar({ situacaoEditorial: 'ativa', prazoParecer: `${prazo}T15:00:00.000Z`, ...classificar() })}>
            Ativar e publicar aviso
          </button>
          <button type="button" className="obs-btn" onClick={() => setModo('')}>
            Cancelar
          </button>
        </div>
        {erro ? <span className="obs-erro">{erro}</span> : null}
      </div>
    )

  if (modo === 'descartar')
    return (
      <div className="obs-acoes coluna" role="group" aria-label={`Descartar ${rotulo}`}>
        <label>
          Motivo
          <select value={motivo} onChange={(e) => setMotivo(e.target.value)}>
            {MOTIVOS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
        <div className="obs-acoes">
          <button type="button" className="obs-btn d" disabled={salvando} onClick={() => salvar({ situacaoEditorial: 'descartada', motivoDescarte: motivo })}>
            Descartar
          </button>
          <button type="button" className="obs-btn" onClick={() => setModo('')}>
            Cancelar
          </button>
        </div>
        {erro ? <span className="obs-erro">{erro}</span> : null}
      </div>
    )

  return (
    <div className="obs-acoes coluna">
      {chips}
      <button type="button" className="obs-btn p" onClick={() => setModo('ativar')}>
        Ativar parecer
      </button>
      <button type="button" className="obs-btn" disabled={salvando} onClick={() => salvar({ situacaoEditorial: 'monitorada', ...classificar() })}>
        Acompanhar
      </button>
      <button type="button" className="obs-btn" onClick={() => setModo('descartar')}>
        Descartar
      </button>
      {erro ? <span className="obs-erro">{erro}</span> : null}
    </div>
  )
}
