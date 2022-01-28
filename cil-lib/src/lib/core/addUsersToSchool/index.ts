import { Logger } from 'pino';

import { AddUsersToSchool, Response } from '../../protos';
import { Operation } from '../../types';
import { ExternalUuid, Uuid } from '../../utils';
import { IdTracked } from '../batchRequest';
import {
  compose,
  DUMMY_PREPARE,
  DUMMY_SEND_REQUEST,
  DUMMY_STORE,
} from '../process';

import { validateMany } from './validate';

export interface PAddUsersToSchool {
  kidsloopSchoolUuid: Uuid;
  userIds: { external: ExternalUuid; kidsloop: Uuid }[];
}

export type IncomingData = IdTracked<AddUsersToSchool, PAddUsersToSchool>;

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
    Operation.ADD_USERS_TO_SCHOOL,
    log
  );
}
