'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Props = { id: number | string; rotulo: string; prazoPadrao: string; abertos: number; limite: number }

const MOTIVOS = ['Fora do tema', 'Homenagem ou data', 'Duplicada', 'Outro']

export function AcoesTriagem({ id, rotulo, prazoPadrao, abertos, limite }: Props) {
  const router = useRouter()
  const [modo, setModo] = useState<'' | 'ativar' | 'descartar'>('')
  const [prazo, setPrazo] = useState(prazoPadrao)
  const [motivo, setMotivo] = useState(MOTIVOS[0])
  const [mesmoAssim, setMesmoAssim] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const lotado = abertos >= limite

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
        <label>
          Prazo prometido
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
          <button type="button" className="obs-btn p" disabled={salvando || !prazo || (lotado && !mesmoAssim)} onClick={() => salvar({ situacaoEditorial: 'ativa', prazoParecer: `${prazo}T15:00:00.000Z` })}>
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
      <button type="button" className="obs-btn p" onClick={() => setModo('ativar')}>
        Ativar parecer
      </button>
      <button type="button" className="obs-btn" disabled={salvando} onClick={() => salvar({ situacaoEditorial: 'monitorada' })}>
        Acompanhar
      </button>
      <button type="button" className="obs-btn" onClick={() => setModo('descartar')}>
        Descartar
      </button>
      {erro ? <span className="obs-erro">{erro}</span> : null}
    </div>
  )
}
