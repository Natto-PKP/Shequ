import { Sucrose } from 'discord-sucrose';
import dotenv from 'dotenv';

dotenv.config();

const sucrose = Sucrose.build({
  env: process.env.NODE_ENV === 'production' ? { source: './dist', extension: 'js' } : { source: './src', extension: 'ts' },
  token: process.env.token,
  intents: 8007,
});

export default sucrose;
