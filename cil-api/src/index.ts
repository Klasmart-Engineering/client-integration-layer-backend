import { config } from 'dotenv';

import { serve } from './lib/api';

config();

if (!process.env.API_KEY || process.env.API_KEY.length < 3)
  throw new Error(`'API_KEY' environment variable must be set`);

function main() {
  serve();
}

main();
