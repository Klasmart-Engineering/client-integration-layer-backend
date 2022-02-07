import { Logger } from 'pino';

import { AddUsersToSchool, Response } from '../../protos';
import { Operation } from '../../types';
import { ExternalUuid, Uuid } from '../../utils';
import { IdTracked } from '../batchRequest';
import { compose } from '../process';

import { sendRequest } from './adminService';
import { persist } from './database';
import { prepare } from './prepare';
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
    prepare,
    sendRequest,
    persist,
    data,
    Operation.ADD_USERS_TO_SCHOOL,
    log
  );
}
