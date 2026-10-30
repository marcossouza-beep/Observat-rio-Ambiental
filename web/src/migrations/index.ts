import * as migration_20261015_015215_inicial from './20261015_015215_inicial';
import * as migration_20261015_020002_armazenamento from './20261015_020002_armazenamento';
import * as migration_20261015_023339_artigos from './20261015_023339_artigos';
import * as migration_20261015_030548_sprint3 from './20261015_030548_sprint3';
import * as migration_20261015_032840_sprint4 from './20261015_032840_sprint4';
import * as migration_20261015_130006_fase2 from './20261015_130006_fase2';
import * as migration_20261015_133325_fase2_parte2 from './20261015_133325_fase2_parte2';
import * as migration_20261015_172744_fase3 from './20261015_172744_fase3';
import * as migration_20261015_180134_sem_embargo from './20261015_180134_sem_embargo';
import * as migration_20261015_181752_fase3_parte2 from './20261015_181752_fase3_parte2';
import * as migration_20261015_194718_fase4 from './20261015_194718_fase4';
import * as migration_20261016_162737_prazo_4_dias from './20261016_162737_prazo_4_dias';
import * as migration_20261017_030200_monitoramento_fontes from './20261017_030200_monitoramento_fontes';
import * as migration_20261030_023534_modelo_parecer_site from './20261030_023534_modelo_parecer_site';

export const migrations = [
  {
    up: migration_20261015_015215_inicial.up,
    down: migration_20261015_015215_inicial.down,
    name: '20261015_015215_inicial',
  },
  {
    up: migration_20261015_020002_armazenamento.up,
    down: migration_20261015_020002_armazenamento.down,
    name: '20261015_020002_armazenamento',
  },
  {
    up: migration_20261015_023339_artigos.up,
    down: migration_20261015_023339_artigos.down,
    name: '20261015_023339_artigos',
  },
  {
    up: migration_20261015_030548_sprint3.up,
    down: migration_20261015_030548_sprint3.down,
    name: '20261015_030548_sprint3',
  },
  {
    up: migration_20261015_032840_sprint4.up,
    down: migration_20261015_032840_sprint4.down,
    name: '20261015_032840_sprint4',
  },
  {
    up: migration_20261015_130006_fase2.up,
    down: migration_20261015_130006_fase2.down,
    name: '20261015_130006_fase2',
  },
  {
    up: migration_20261015_133325_fase2_parte2.up,
    down: migration_20261015_133325_fase2_parte2.down,
    name: '20261015_133325_fase2_parte2',
  },
  {
    up: migration_20261015_172744_fase3.up,
    down: migration_20261015_172744_fase3.down,
    name: '20261015_172744_fase3',
  },
  {
    up: migration_20261015_180134_sem_embargo.up,
    down: migration_20261015_180134_sem_embargo.down,
    name: '20261015_180134_sem_embargo',
  },
  {
    up: migration_20261015_181752_fase3_parte2.up,
    down: migration_20261015_181752_fase3_parte2.down,
    name: '20261015_181752_fase3_parte2',
  },
  {
    up: migration_20261015_194718_fase4.up,
    down: migration_20261015_194718_fase4.down,
    name: '20261015_194718_fase4',
  },
  {
    up: migration_20261016_162737_prazo_4_dias.up,
    down: migration_20261016_162737_prazo_4_dias.down,
    name: '20261016_162737_prazo_4_dias',
  },
  {
    up: migration_20261017_030200_monitoramento_fontes.up,
    down: migration_20261017_030200_monitoramento_fontes.down,
    name: '20261017_030200_monitoramento_fontes',
  },
  {
    up: migration_20261030_023534_modelo_parecer_site.up,
    down: migration_20261030_023534_modelo_parecer_site.down,
    name: '20261030_023534_modelo_parecer_site'
  },
];
