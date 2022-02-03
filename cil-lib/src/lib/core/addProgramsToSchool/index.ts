import { Logger } from 'pino';

import { Uuid } from '../../..';
import { AddProgramsToSchool, Response } from '../../protos';
import { Operation } from '../../types';
import { IdTracked } from '../batchRequest';
import { compose } from '../process';

import { sendRequest } from './adminService';
import { persist } from './database';
import { prepare } from './prepare';
import { validateMany } from './validate';

export interface PAddProgramsToSchool {
  kidsloopOrganizationUuid: Uuid;
  kidsloopSchoolUuid: Uuid;
  programIds: { id: Uuid; name: string }[];
}

export type IncomingData = IdTracked<AddProgramsToSchool, PAddProgramsToSchool>;

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
    Operation.ADD_PROGRAMS_TO_SCHOOL,
    log
  );
}
