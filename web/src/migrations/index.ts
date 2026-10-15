import * as migration_20261015_015215_inicial from './20261015_015215_inicial';
import * as migration_20261015_020002_armazenamento from './20261015_020002_armazenamento';
import * as migration_20261015_023339_artigos from './20261015_023339_artigos';

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
    name: '20261015_023339_artigos'
  },
];
