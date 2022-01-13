import { config } from 'dotenv';

import { serve } from './lib/api';

config();

function main() {
  serve();
}

main();
