import { config } from 'dotenv';

import { serve } from './lib/api';

config();

if (!process.env.API_KEY || process.env.API_KEY.length < 3)
  throw new Error(`'API_KEY' environment variable must be set`);

async function main() {
  await serve();
}

main().catch((e) => console.log(`App crashed with error \n`, e));
