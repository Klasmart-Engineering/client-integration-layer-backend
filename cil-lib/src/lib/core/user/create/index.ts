import { Logger } from 'pino';

import { Response, User } from '../../../protos';
import { Operation } from '../../../types';
import { Uuid } from '../../../utils';
import { IdTracked } from '../../batchRequest';
import { compose } from '../../process';

import { sendRequest } from './adminService';
import { persist } from './database';
import { prepare } from './prepare';
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
    prepare,
    sendRequest,
    persist,
    data,
    Operation.CREATE_USER,
    log
  );
}
