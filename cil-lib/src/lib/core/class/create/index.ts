import { Logger } from 'pino';

import { Class, Response } from '../../../protos';
import { Operation } from '../../../types';
import { Uuid } from '../../../utils';
import { IdTracked } from '../../batchRequest';
import {
  compose,
  DUMMY_PREPARE,
  DUMMY_SEND_REQUEST,
  DUMMY_STORE,
} from '../../process';

import { validateMany } from './validate';

export interface CreateClass {
  kidsloopOrganizationUuid: Uuid;
  kidsloopSchoolUuid: Uuid;
  kidsloopClassUuid: Uuid;
}

export type IncomingData = IdTracked<Class, CreateClass>;

export function process(
  data: IncomingData[],
  log: Logger
): Promise<Response[]> {
  return compose(
    validateMany,
    DUMMY_PREPARE,
    DUMMY_SEND_REQUEST,
    DUMMY_STORE,
    data,
    Operation.CREATE_CLASS,
    log
  );
}
