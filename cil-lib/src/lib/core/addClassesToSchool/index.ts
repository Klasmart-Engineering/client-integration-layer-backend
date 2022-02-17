import { Logger } from 'pino';

import { Uuid } from '../../..';
import { AddClassesToSchool, Response } from '../../protos';
import { Operation } from '../../types';
import { ExternalUuid } from '../../utils';
import { IdTracked } from '../batchRequest';
import { compose } from '../process';

import { sendRequest } from './adminService';
import { persist } from './database';
import { prepare } from './prepare';
import { validateMany } from './validate';

export interface PAddClassesToSchool {
  kidsloopSchoolUuid: Uuid;
  kidsloopClassIds: { external: ExternalUuid; kidsloop: Uuid }[];
}

export type IncomingData = IdTracked<AddClassesToSchool, PAddClassesToSchool>;

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
    Operation.ADD_CLASSES_TO_SCHOOL,
    log
  );
}
