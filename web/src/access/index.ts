import type { Access, FieldAccess } from 'payload'

type ComPapel = { papel?: string | null; collection?: string } | null | undefined

const papel = (user: unknown) => (user as ComPapel)?.papel
const ehUsuario = (user: unknown) => !!user && (user as ComPapel)?.collection === 'users'

/** Equipe = qualquer usuário do painel (administrador, autor, revisor). */
export const equipe: Access = ({ req: { user } }) => ehUsuario(user)
export const admin: Access = ({ req: { user } }) => ehUsuario(user) && papel(user) === 'admin'
export const publico: Access = () => true
export const campoSoEquipe: FieldAccess = ({ req: { user } }) => ehUsuario(user)

/** Visitante só lê pareceres publicados; a equipe lê todos. */
export const publicadoOuEquipe: Access = ({ req: { user } }) => {
  if (ehUsuario(user)) return true
  return { status: { equals: 'publicado' } }
}

/** Proposições na triagem ou descartadas nunca aparecem para o visitante. */
export const proposicaoPublicaOuEquipe: Access = ({ req: { user } }) => {
  if (ehUsuario(user)) return true
  return { situacaoEditorial: { in: ['ativa', 'monitorada'] } }
}
