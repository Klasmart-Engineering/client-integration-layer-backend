// declare module '@newrelic/pino-enricher' {
//   import { LoggerOptions } from 'pino';
//   function nrPino(): LoggerOptions;
//   export = nrPino;
// }
declare module '@newrelic/pino-enricher' {
  import pino = require('pino');
  const _default: () => pino.LoggerOptions | pino.DestinationStream | undefined;
  export default _default;
}
