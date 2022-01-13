import nrPino from '@newrelic/pino-enricher';
import pino from 'pino';

export const log = pino({
  ...nrPino(),
  name: process.env.SERVICE_LABEL || 'cil',
  formatters: {
    level: (label) => ({
      level: label,
    }),
  },
});
