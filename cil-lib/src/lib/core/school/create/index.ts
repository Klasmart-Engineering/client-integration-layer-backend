import { Logger } from 'pino';

import { Response, School } from '../../../protos';
import { Operation } from '../../../types';
import { Uuid } from '../../../utils';
import { IdTracked } from '../../batchRequest';
import { compose } from '../../process';

import { sendRequest } from './adminService';
import { persist } from './database';
import { prepare } from './prepare';
import { validateMany } from './validate';

export interface CreateSchool {
  kidsloopOrganizationUuid: Uuid;
  kidsloopSchoolUuid: Uuid;
}

export type IncomingData = IdTracked<School, CreateSchool>;

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
    Operation.CREATE_SCHOOL,
    log
  );
}
