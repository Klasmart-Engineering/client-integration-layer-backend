import pino from 'pino';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const nrPino = require('@newrelic/pino-enricher');

export const log = pino({
  ...nrPino(),
  name: process.env.SERVICE_LABEL || 'cil',
  enabled: process.env.LOG_ENABLED === 'false' ? false : true,
  formatters: {
    level: (label: string) => ({
      level: label,
    }),
  },
});
