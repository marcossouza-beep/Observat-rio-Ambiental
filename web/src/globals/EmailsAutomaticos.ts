import type { GlobalConfig } from 'payload'
import { equipe } from '../access'

/**
 * Alerta diário e resumo semanal (docs/ENTREGA.md, "E-mails").
 * O resumo sai sozinho na sexta, 17h; a nota do autor, se houver, entra no topo e some depois do envio.
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
