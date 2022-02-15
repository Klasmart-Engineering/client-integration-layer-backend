import { Logger } from 'pino';

import { Result } from '../core/process';
import { Response } from '../protos';
import { AdminDupeError } from '../services/adminService';

export async function retryDupes<T>(
  incoming: T[],
  error: AdminDupeError,
  invalid: Response[],
  sendRequest: (
    incomingRequest: T[],
    log: Logger,
    retry: boolean
  ) => Promise<[Result<T>, Logger]>,
  dupeErrors: (
    error: AdminDupeError,
    incomingData: T[],
    log: Logger
  ) => Result<T>,
  log: Logger
): Promise<RetryResult<T>> {
  const retries = dupeErrors(error, incoming, log);

  if (retries.valid.length > 0) {
    invalid = invalid.concat(retries.invalid);
    const result = await sendRequestWithNoRetry(
      retries.valid,
      log,
      sendRequest
    );
    const results = result[0];
    return new RetryResult(
      results.valid,
      invalid.concat(results.invalid),
      log,
      true
    );
  }
  return new RetryResult([], retries.invalid, log);
}

class RetryResult<T> {
  private retried: boolean;
  private invalid: Response[] = [];
  private valid: T[] = [];
  private log: Logger;

  constructor(
    valid: T[],
    invalid: Response[],
    log: Logger,
    hasRetried = false
  ) {
    this.invalid = this.invalid.concat(invalid);
    this.retried = hasRetried;
    this.valid = this.valid.concat(valid);
    this.log = log;
  }

  public hasRetried(): boolean {
    return this.retried;
  }

  public getRetryResult(): [Result<T>, Logger] {
    return [{ valid: this.valid, invalid: this.invalid }, this.log];
  }

  public getInvalid(): Response[] {
    return this.invalid;
  }
}

function sendRequestWithNoRetry<T>(
  incomingData: T[],
  log: Logger,
  sendRequest: (
    data: T[],
    log: Logger,
    retry: boolean
  ) => Promise<[Result<T>, Logger]>
): Promise<[Result<T>, Logger]> {
  return sendRequest(incomingData, log, false);
}
