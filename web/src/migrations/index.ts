import * as migration_20261015_015215_inicial from './20261015_015215_inicial';
import * as migration_20261015_020002_armazenamento from './20261015_020002_armazenamento';

export const migrations = [
  {
    up: migration_20261015_015215_inicial.up,
    down: migration_20261015_015215_inicial.down,
    name: '20261015_015215_inicial',
  },
  {
    up: migration_20261015_020002_armazenamento.up,
    down: migration_20261015_020002_armazenamento.down,
    name: '20261015_020002_armazenamento'
  },
];
