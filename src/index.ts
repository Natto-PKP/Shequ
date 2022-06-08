import { Sucrose } from 'discord-sucrose';
import dotenv from 'dotenv';

import cache from './cache';

dotenv.config();

(async () => {
  await Sucrose.build({
    env: process.env.NODE_ENV === 'production' ? { source: './dist', extension: 'js' } : { source: './src', extension: 'ts' },
    token: process.env.token,
    intents: 8007,
  });

  await cache.connect();
})();
