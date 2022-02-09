import { Logger } from 'pino';

import { AddUsersToClass, Response } from '../../protos';
import { Operation } from '../../types';
import { ExternalUuid, Uuid } from '../../utils';
import { IdTracked } from '../batchRequest';
import { compose } from '../process';

import { sendRequest } from './adminService';
import { toSuccessResponses } from './database';
import { prepare } from './prepare';
import { validateMany } from './validate';

export interface PAddUsersToClass {
  kidsloopClassUuid: Uuid;
  teacherUuids: { external: ExternalUuid; kidsloop: Uuid }[];
  studentUuids: { external: ExternalUuid; kidsloop: Uuid }[];
}

export type IncomingData = IdTracked<AddUsersToClass, PAddUsersToClass>;

export function process(
  data: IncomingData[],
  log: Logger
): Promise<Response[]> {
  return compose(
    validateMany,
    prepare,
    sendRequest,
    toSuccessResponses,
    data,
    Operation.ADD_USERS_TO_CLASS,
    log
  );
}
