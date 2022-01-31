export { log } from './log';
export { Context } from './context';
export { VALIDATION_RULES, JOI_VALIDATION_SETTINGS } from './validationRules';

export type ExternalUuid = string;
export type Uuid = string;

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
