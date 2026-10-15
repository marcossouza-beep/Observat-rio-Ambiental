/**
 * Congresso Nacional (pela API do Senado): vetos e resultado da apreciação.
 * O veto vira andamento da proposta vetada; o código do veto vira chave extra dela,
 * para a agenda das sessões do Congresso (que cita o veto) cair na proposta certa.
 */
import { chaveDaNorma, chaveMateria } from '../senado/mapear'
import type { EventoColetado } from '../tipos'
import { dataBrasilia, inteiro, lista, texto } from '../util'

type Materia = { Codigo?: string; Sigla?: string; Numero?: string; Ano?: string; EmTramitacao?: string; NormaGerada?: { SiglaTipoNorma?: string; NumeroNorma?: string; AnoNorma?: string } }
export type VetoBruto = {
  Codigo?: string
  Materia?: Materia
  MateriaVetada?: Materia
  Mensagem?: { Numero?: string; Ano?: string; UrlPlanalto?: string }
  Total?: string
  Assunto?: string
  DataPublicacao?: string
  DataRecebimentoCongresso?: string
  DataSobrestacaoPauta?: string
  QuantidadeDispositivos?: string
  Dispositivos?: { Dispositivo?: unknown }
}
type Dispositivo = { Situacao?: string; DataSessao?: string }

const dataCurta = (iso?: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '')

export const vetosDoAno = (bruto: unknown) => lista<VetoBruto>((bruto as { ListaVetosAnoCN?: { Vetos?: { Veto?: unknown } } })?.ListaVetosAnoCN?.Vetos?.Veto)
export const vetoDoResultado = (bruto: unknown) => (bruto as { ResultadoVetoMateriaCN?: { Veto?: VetoBruto } })?.ResultadoVetoMateriaCN?.Veto

/** Alvo do veto: a proposta vetada, pelo código da matéria e pelo número (ex.: "PL 2951/2024"). */
export function alvoDoVeto(v: VetoBruto) {
  const m = v.MateriaVetada || {}
  const n = inteiro(m.Numero)
  return {
    chaves: [m.Codigo ? chaveMateria(m.Codigo) : '', ...chaveDaNorma(m.NormaGerada?.SiglaTipoNorma, m.NormaGerada?.NumeroNorma, m.NormaGerada?.AnoNorma)].filter(Boolean),
    identificacoes: m.Sigla && n && m.Ano ? [`${m.Sigla} ${n}/${m.Ano}`] : [],
  }
}

export function eventoDoVeto(v: VetoBruto, resultado?: VetoBruto): EventoColetado | null {
  if (!v.Codigo || !v.Materia?.Codigo) return null
  const total = v.Total === 'Sim'
  const n = v.QuantidadeDispositivos ? Number(v.QuantidadeDispositivos) : undefined
  const data = dataBrasilia(v.DataPublicacao || v.DataRecebimentoCongresso)
  if (!data) return null
  const tranca = dataBrasilia(v.DataSobrestacaoPauta)
  const descricao = [
    `Veto ${total ? 'total' : 'parcial'} nº ${inteiro(v.Materia.Numero)}/${v.Materia.Ano}${!total && n ? ` (${n} ${n === 1 ? 'dispositivo' : 'dispositivos'})` : ''}`,
    texto(v.Assunto),
    tranca ? `Passa a trancar a pauta do Congresso em ${dataCurta(tranca)}` : '',
  ]
    .filter(Boolean)
    .join('. ')
  const tramitacoes: EventoColetado['tramitacoes'] = [
    { chave: `congresso:veto:${v.Codigo}`, data, orgao: 'CN', descricao, tipoEvento: 'veto', urlDocumento: texto(v.Mensagem?.UrlPlanalto) },
  ]
  // Resultado da apreciação: "Mantido" ou "Rejeitado" (veto derrubado) por dispositivo
  const dispositivos = lista<Dispositivo>(resultado?.Dispositivos?.Dispositivo).filter((d) => d.Situacao)
  if (dispositivos.length) {
    const mantidos = dispositivos.filter((d) => /mantid/i.test(d.Situacao!)).length
    const derrubados = dispositivos.filter((d) => /rejeitad|derrubad/i.test(d.Situacao!)).length
    const quando = dispositivos.map((d) => d.DataSessao).filter(Boolean).sort().pop()
    const dataRes = dataBrasilia(quando)
    if (dataRes && mantidos + derrubados) {
      const partes = [mantidos ? `${mantidos} ${mantidos === 1 ? 'mantido' : 'mantidos'}` : '', derrubados ? `${derrubados} ${derrubados === 1 ? 'derrubado' : 'derrubados'}` : ''].filter(Boolean)
      tramitacoes.push({
        chave: `congresso:veto:${v.Codigo}:resultado`,
        data: dataRes,
        orgao: 'CN',
        descricao: total && dispositivos.length === 1 ? `Congresso ${derrubados ? 'derrubou' : 'manteve'} o veto total` : `Congresso apreciou o veto: ${partes.join(', ')}`,
        tipoEvento: 'votacao',
      })
    }
  }
  return { alvo: alvoDoVeto(v), chavesExtras: [chaveMateria(v.Materia.Codigo)], tramitacoes }
}
