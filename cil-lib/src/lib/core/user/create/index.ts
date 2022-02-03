import { Logger } from 'pino';

import { Response, User } from '../../../protos';
import { Operation } from '../../../types';
import { Uuid } from '../../../utils';
import { IdTracked } from '../../batchRequest';
import { compose, NOOP } from '../../process';

import { sendRequest } from './adminService';
import { persist } from './database';
import { validateMany } from './validate';

export interface CreateUser {
  kidsloopUserUuid: Uuid;
}

export type IncomingData = IdTracked<User, CreateUser>;

export function process(
  data: IncomingData[],
  log: Logger
): Promise<Response[]> {
  return compose(
    validateMany,
    NOOP,
    sendRequest,
    persist,
    data,
    Operation.CREATE_USER,
    log
  );
}
