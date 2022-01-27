import { Logger } from 'pino';

import { Response, User } from '../../../protos';
import { Operation } from '../../../types';
import { IdTracked } from '../../../utils/parseBatchRequests';
import { compose, DUMMY_SEND_REQUEST, DUMMY_STORE } from '../../process';

import { validateMany } from './validate';

export type IncomingData = IdTracked<User>;

export function process(
  data: IncomingData[],
  log: Logger
): Promise<Response[]> {
  return compose(
    validateMany,
    DUMMY_SEND_REQUEST,
    DUMMY_STORE,
    data,
    Operation.CREATE_USER,
    log
  );
}
