import type { GlobalConfig } from 'payload'
import { campoSoEquipe } from '../access'
import { LIMITE_PROMETIDOS_PADRAO, PRAZOS_PADRAO } from '../lib/compromissos'

export const Ajustes: GlobalConfig = {
  slug: 'ajustes',
  label: 'Ajustes',
  admin: { group: 'Ajustes', description: 'Os prazos daqui comandam os avisos do painel e os textos públicos.' },
  access: { read: () => true, update: ({ req: { user } }) => (user as { papel?: string } | null)?.papel === 'admin' },
  fields: [
    {
      name: 'prazos',
      label: 'Prazos prometidos',
      type: 'group',
      fields: [
        { name: 'parecer', label: 'Parecer publicado (dias corridos desde que a proposta saiu)', type: 'number', min: 1, defaultValue: PRAZOS_PADRAO.parecer_prometido.dias },
        { name: 'atualizacao', label: 'Atualização do parecer (dias corridos desde a nova versão do texto)', type: 'number', min: 1, defaultValue: PRAZOS_PADRAO.atualizacao.dias },
        { name: 'correcao', label: 'Resposta a correção (dias úteis)', type: 'number', min: 1, defaultValue: PRAZOS_PADRAO.correcao.dias },
        { name: 'credenciamento', label: 'Verificação de imprensa (dias úteis)', type: 'number', min: 1, defaultValue: PRAZOS_PADRAO.credenciamento.dias },
        { name: 'lgpd', label: 'Pedido de dados pessoais (dias)', type: 'number', min: 1, max: 15, defaultValue: PRAZOS_PADRAO.lgpd.dias },
      ],
    },
    { name: 'limitePrometidos', label: 'Limite de pareceres prometidos em aberto', type: 'number', min: 1, defaultValue: LIMITE_PROMETIDOS_PADRAO },
    { name: 'metaSemanal', label: 'Meta de pareceres por semana', type: 'number', min: 1, max: 20, defaultValue: 6, admin: { description: 'Indicador interno; não aparece no site.' } },
    {
      name: 'coleta',
      label: 'Coleta automática (Radar)',
      type: 'group',
      access: { read: campoSoEquipe },
      fields: [
        {
          name: 'notaMinima',
          label: 'Nota mínima para entrar na triagem',
          type: 'number',
          min: 0,
          max: 100,
          defaultValue: 40,
          admin: { description: 'Propostas novas abaixo desta nota (dicionário de palavras-chave) não entram na triagem. Tema oficial de meio ambiente soma 30.' },
        },
        { name: 'maxNovas', label: 'Máximo de propostas novas por coleta e por casa', type: 'number', min: 1, max: 200, defaultValue: 40 },
      ],
    },
    {
      name: 'alertas',
      label: 'Alertas para o autor',
      type: 'group',
      access: { read: campoSoEquipe },
      fields: [
        { name: 'email', type: 'email' },
        { name: 'telegramChatId', label: 'Telegram (chat id)', type: 'text' },
      ],
    },
  ],
}
