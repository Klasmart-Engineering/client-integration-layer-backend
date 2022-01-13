declare module '@newrelic/pino-enricher' {
  import { LoggerOptions } from 'pino';
  function nrPino(): LoggerOptions;
  export = nrPino;
}
