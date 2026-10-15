type P = { className?: string }
const svg = (d: React.ReactNode, cls = 'ico') => (
  <svg className={cls} viewBox="0 0 24 24" aria-hidden="true">
    {d}
  </svg>
)
export const Seta = ({ className }: P) => svg(<path d="M5 12h14M13 6l6 6-6 6" />, `ico ico-r ${className || ''}`)
export const SetaEsq = ({ className }: P) => svg(<path d="M19 12H5M11 6l-6 6 6 6" />, `ico ico-l ${className || ''}`)
export const Lupa = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
)
export const Relogio = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
)
const tema = (d: string) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: d }} />
)
export const IconeFederal = () => tema('<path d="M3 9.2 12 4l9 5.2z"/><path d="M5.5 11.5v6M10 11.5v6M14 11.5v6M18.5 11.5v6"/><path d="M3.5 20h17"/>')
export const IconeEstadual = () => tema('<path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21z"/><path d="m9.2 9.8 2 2 3.6-3.8"/>')
export const IconeOpiniao = () => tema('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4"/><path d="M14 3v5h5v3"/><path d="M8.5 12h5M8.5 15.5h3"/><circle cx="17" cy="17" r="3.5"/><path d="m15.6 17 1 1 1.9-2"/>')
export const IconeArtigos = () => tema('<path d="M4 5h13v14H6a2 2 0 0 1-2-2z"/><path d="M17 9h3v8a2 2 0 0 1-2 2"/><path d="M7.5 9h6M7.5 12.5h6M7.5 16h4"/>')
export const IconePdf = () => tema('<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>')
