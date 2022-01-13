export { log } from './log';
export { processMessage } from './process';

export type ClientUuid = string;
export type Uuid = string;

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
