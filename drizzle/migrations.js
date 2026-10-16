// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo
// NOTE: `drizzle-kit generate` rewrites this file from the snapshot chain and drops
// `20260727081855_calm_chimera` (its folder has no snapshot.json). That migration is a
// Novel/Chapter table rebuild that must stay in the map - re-add it after generating.

import m0000 from './20251222152612_past_mandrill/migration.sql';
import m0001 from './20260612232322_normal_saracen/migration.sql';
import m0002 from './20260719143427_long_moondragon/migration.sql';
import m0003 from './20260727081855_calm_chimera/migration.sql';
import m0004 from './20260811071655_parched_human_torch/migration.sql';
import m0005 from './20261015155923_bright_mad_thinker/migration.sql';

export default {
  migrations: {
    '20251222152612_past_mandrill': m0000,
    '20260612232322_normal_saracen': m0001,
    '20260719143427_long_moondragon': m0002,
    '20260727081855_calm_chimera': m0003,
    '20260811071655_parched_human_torch': m0004,
    '20261015155923_bright_mad_thinker': m0005,
  },
};
  