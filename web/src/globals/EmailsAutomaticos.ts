import type { GlobalConfig } from 'payload'
import { equipe } from '../access'
import { REGIOES } from '../lib/resumo'

/**
 * Alerta diário e resumo semanal (docs/ENTREGA.md, "E-mails").
 * O resumo sai sozinho na sexta, 17h; a nota do autor, se houver, entra no topo e some depois do envio.
 * Quem informou o estado recebe a edição da sua região, com a nota regional (se houver) logo depois da nacional.
 */
export const EmailsAutomaticos: GlobalConfig = {
  slug: 'emails-automaticos',
  label: 'E-mails automáticos',
  admin: { group: 'Público', description: 'Alerta diário (19h) para quem segue leis e resumo semanal (sexta, 17h).' },
  access: { read: equipe, update: equipe },
  fields: [
    {
      name: 'resumo',
      label: 'Resumo semanal',
      type: 'group',
      fields: [
        {
          name: 'nota',
          label: 'Nota do autor para esta sexta',
          type: 'textarea',
          admin: { description: 'Opcional. Entra no topo do resumo desta semana e é apagada depois do envio. Se ficar vazia, o resumo sai assim mesmo.' },
        },
        {
          name: 'notasRegionais',
          label: 'Notas das edições regionais',
          labels: { singular: 'Nota regional', plural: 'Notas regionais' },
          type: 'array',
          admin: { description: 'Opcional. Cada nota vai só para quem mora na região (pelo estado informado), depois da nota nacional. Apagadas depois do envio.' },
          fields: [
            { name: 'regiao', label: 'Região', type: 'select', required: true, options: REGIOES.map((r) => ({ label: r, value: r })) },
            { name: 'nota', label: 'Nota', type: 'textarea', required: true },
          ],
        },
        { name: 'pular', label: 'Não enviar o resumo desta semana', type: 'checkbox', defaultValue: false, admin: { description: 'Vale só para a próxima sexta.' } },
        { name: 'ultimoEnvio', label: 'Último envio', type: 'date', admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } } },
        { name: 'ultimoTotal', label: 'Pessoas no último envio', type: 'number', admin: { readOnly: true } },
      ],
    },
    {
      name: 'alertas',
      label: 'Alerta diário',
      type: 'group',
      fields: [
        { name: 'ultimoEnvio', label: 'Último envio', type: 'date', admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } } },
        { name: 'ultimoTotal', label: 'Pessoas no último envio', type: 'number', admin: { readOnly: true } },
      ],
    },
  ],
}
