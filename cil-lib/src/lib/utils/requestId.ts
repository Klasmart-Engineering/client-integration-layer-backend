import LRU from 'lru-cache';
import { Logger } from 'pino';
import { validate } from 'uuid';

import { Category, MachineError, OnboardingError } from '../errors';

import { Uuid } from '.';

export class RequestIdTracker {
  private static _instance: RequestIdTracker;

  private cache: LRU<Uuid, null>;

  private constructor() {
    this.cache = new LRU({
      max: 250,
      maxAge: 5 * 60 * 1000,
    });
  }

  public static getInstance(): RequestIdTracker {
    if (this._instance) return this._instance;
    this._instance = new RequestIdTracker();
    return this._instance;
  }

  /**
   * @param {Uuid} id - the request id to add to the tracker
   * @throws if the id is already present in the cache
   * @throws if the id is not a valid uuid
   */
  public addId(id: Uuid, log: Logger): void {
    const isValid = validate(id);
    if (!isValid)
      throw new OnboardingError(
        MachineError.VALIDATION,
        'Request ID is not a valid uuid',
        Category.REQUEST,
        log
      );
    if (this.cache.has(id))
      throw new OnboardingError(
        MachineError.VALIDATION,
        `A request with the id ${id} has already been processed, please generate
        a new id and re-send the request`,
        Category.REQUEST,
        log
      );
    this.cache.set(id, null);
  }
}
