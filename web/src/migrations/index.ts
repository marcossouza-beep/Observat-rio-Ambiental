import * as migration_20261015_015215_inicial from './20261015_015215_inicial';
import * as migration_20261015_020002_armazenamento from './20261015_020002_armazenamento';
import * as migration_20261015_023339_artigos from './20261015_023339_artigos';
import * as migration_20261015_030548_sprint3 from './20261015_030548_sprint3';
import * as migration_20261015_032840_sprint4 from './20261015_032840_sprint4';
import * as migration_20261015_130006_fase2 from './20261015_130006_fase2';
import * as migration_20261015_133325_fase2_parte2 from './20261015_133325_fase2_parte2';
import * as migration_20261015_172744_fase3 from './20261015_172744_fase3';
import * as migration_20261015_180134_sem_embargo from './20261015_180134_sem_embargo';

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
    name: '20261015_180134_sem_embargo'
  },
];
