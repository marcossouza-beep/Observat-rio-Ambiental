/** Dados iniciais: áreas, biomas, fontes e o dicionário de palavras-chave de partida. */

export const TEMAS = [
  'Licenciamento',
  'Florestas',
  'Água',
  'Clima',
  'Mineração',
  'Agrotóxicos',
  'Espécies exóticas',
  'Unidades de conservação',
  'Povos e comunidades',
  'Fauna',
  'Saneamento',
]

export const BIOMAS: [string, string[]][] = [
  ['Amazônia', ['AC', 'AM', 'AP', 'MA', 'MT', 'PA', 'RO', 'RR', 'TO']],
  ['Cerrado', ['BA', 'DF', 'GO', 'MA', 'MG', 'MS', 'MT', 'PI', 'PR', 'SP', 'TO']],
  ['Caatinga', ['AL', 'BA', 'CE', 'MA', 'MG', 'PB', 'PE', 'PI', 'RN', 'SE']],
  ['Mata Atlântica', ['AL', 'BA', 'CE', 'ES', 'GO', 'MG', 'MS', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RS', 'SC', 'SE', 'SP']],
  ['Pantanal', ['MS', 'MT']],
  ['Pampa', ['RS']],
  ['Costeiro e marinho', ['AL', 'AP', 'BA', 'CE', 'ES', 'MA', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RS', 'SC', 'SE', 'SP']],
]

export const FONTES = [
  { slug: 'camara', nome: 'Câmara · Dados Abertos', conector: 'camara', nivel: 'A', esfera: 'federal' },
  { slug: 'senado', nome: 'Senado · Dados Abertos', conector: 'senado', nivel: 'A', esfera: 'federal' },
  { slug: 'congresso', nome: 'Congresso · vetos e sessões', conector: 'senado', nivel: 'A', esfera: 'federal' },
  { slug: 'dou', nome: 'Diário Oficial da União (INLABS)', conector: 'dou', nivel: 'A', esfera: 'federal' },
  { slug: 'lexml', nome: 'LexML · legislação vigente', conector: 'lexml', nivel: 'A', esfera: 'federal' },
  { slug: 'tse', nome: 'TSE · deputados estaduais', conector: 'tse', nivel: 'A', esfera: 'estadual', frequencia: 'Por legislatura', manual: true },
] as const

/** [termo, grupo, peso, exclusão] — ponto de partida; o autor ajusta no painel. */
export const PALAVRAS: [string, string, number, boolean?][] = [
  ['licenciamento ambiental', 'Licenciamento', 10],
  ['licença ambiental', 'Licenciamento', 9],
  ['estudo de impacto ambiental', 'Licenciamento', 9],
  ['EIA/RIMA', 'Licenciamento', 9],
  ['Código Florestal', 'Florestas', 9],
  ['área de preservação permanente', 'Florestas', 9],
  ['reserva legal', 'Florestas', 8],
  ['desmatamento', 'Florestas', 8],
  ['vegetação nativa', 'Florestas', 8],
  ['Cadastro Ambiental Rural', 'Florestas', 7],
  ['Programa de Regularização Ambiental', 'Florestas', 7],
  ['incêndios florestais', 'Florestas', 7],
  ['recursos hídricos', 'Água', 8],
  ['outorga', 'Água', 6],
  ['bacia hidrográfica', 'Água', 6],
  ['mudança do clima', 'Clima', 8],
  ['mudanças climáticas', 'Clima', 8],
  ['mercado de carbono', 'Clima', 8],
  ['emissões de gases de efeito estufa', 'Clima', 8],
  ['mineração', 'Mineração', 8],
  ['garimpo', 'Mineração', 9],
  ['lavra', 'Mineração', 6],
  ['agrotóxico', 'Agrotóxicos', 9],
  ['agrotóxicos', 'Agrotóxicos', 9],
  ['defensivos agrícolas', 'Agrotóxicos', 8],
  ['espécies exóticas', 'Espécies exóticas', 9],
  ['espécie exótica', 'Espécies exóticas', 9],
  ['espécies invasoras', 'Espécies exóticas', 9],
  ['tilápia', 'Espécies exóticas', 6],
  ['aquicultura', 'Espécies exóticas', 6],
  ['unidade de conservação', 'Unidades de conservação', 9],
  ['unidades de conservação', 'Unidades de conservação', 9],
  ['reserva extrativista', 'Unidades de conservação', 8],
  ['SNUC', 'Unidades de conservação', 8],
  ['terra indígena', 'Povos e comunidades', 8],
  ['terras indígenas', 'Povos e comunidades', 8],
  ['comunidades tradicionais', 'Povos e comunidades', 7],
  ['quilombola', 'Povos e comunidades', 6],
  ['fauna', 'Fauna', 6],
  ['pesca', 'Fauna', 5],
  ['saneamento básico', 'Saneamento', 6],
  ['resíduos sólidos', 'Saneamento', 6],
  ['meio ambiente', 'Geral', 5],
  ['ambiental', 'Geral', 3],
  ['Amazônia', 'Bioma', 5],
  ['Cerrado', 'Bioma', 5],
  ['Caatinga', 'Bioma', 5],
  ['Mata Atlântica', 'Bioma', 5],
  ['Pantanal', 'Bioma', 6],
  ['Pampa', 'Bioma', 4],
  ['denominação', 'Exclusão', 0, true],
  ['dia nacional', 'Exclusão', 0, true],
  ['semana nacional', 'Exclusão', 0, true],
  ['título de cidadão', 'Exclusão', 0, true],
]

/**
 * [termo, grupo, peso, UF] — palavras da região Norte que só contam nas propostas daquele estado (Fase 5).
 * Órgãos ambientais estaduais, áreas protegidas, rios e conflitos conhecidos de cada estado. O autor ajusta no painel.
 */
export const PALAVRAS_NORTE: [string, string, number, string][] = [
  // Tocantins
  ['Naturatins', 'Órgão ambiental', 8, 'TO'],
  ['Jalapão', 'Unidades de conservação', 7, 'TO'],
  ['Ilha do Bananal', 'Unidades de conservação', 7, 'TO'],
  ['Cantão', 'Unidades de conservação', 6, 'TO'],
  ['Rio Araguaia', 'Água', 6, 'TO'],
  ['Rio Tocantins', 'Água', 6, 'TO'],
  ['Matopiba', 'Florestas', 6, 'TO'],
  // Acre
  ['Imac', 'Órgão ambiental', 8, 'AC'],
  ['Serra do Divisor', 'Unidades de conservação', 7, 'AC'],
  ['Chico Mendes', 'Unidades de conservação', 6, 'AC'],
  ['Rio Acre', 'Água', 6, 'AC'],
  ['serviços ambientais', 'Clima', 7, 'AC'],
  // Amazonas
  ['Ipaam', 'Órgão ambiental', 8, 'AM'],
  ['Sema-AM', 'Órgão ambiental', 8, 'AM'],
  ['BR-319', 'Florestas', 7, 'AM'],
  ['Bolsa Floresta', 'Clima', 7, 'AM'],
  ['Rio Negro', 'Água', 5, 'AM'],
  ['manejo florestal', 'Florestas', 7, 'AM'],
  // Rondônia
  ['Sedam', 'Órgão ambiental', 8, 'RO'],
  ['Guajará-Mirim', 'Unidades de conservação', 6, 'RO'],
  ['Jaci-Paraná', 'Unidades de conservação', 7, 'RO'],
  ['Rio Madeira', 'Água', 6, 'RO'],
  ['zoneamento socioeconômico-ecológico', 'Florestas', 8, 'RO'],
  // Pará
  ['Semas', 'Órgão ambiental', 8, 'PA'],
  ['Ideflor', 'Órgão ambiental', 8, 'PA'],
  ['Belo Monte', 'Água', 6, 'PA'],
  ['Tapajós', 'Água', 6, 'PA'],
  ['Xingu', 'Água', 6, 'PA'],
  ['Carajás', 'Mineração', 6, 'PA'],
  // Amapá
  ['Imap', 'Órgão ambiental', 8, 'AP'],
  ['Tumucumaque', 'Unidades de conservação', 7, 'AP'],
  ['Foz do Amazonas', 'Costeiro e marinho', 7, 'AP'],
  // Roraima
  ['Femarh', 'Órgão ambiental', 8, 'RR'],
  ['Yanomami', 'Povos e comunidades', 8, 'RR'],
  ['lavrado', 'Florestas', 6, 'RR'],
]
