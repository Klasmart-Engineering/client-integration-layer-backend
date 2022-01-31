import { Logger } from 'pino';

import { Uuid } from '../../..';
import { AddProgramsToSchool, Response } from '../../protos';
import { Operation } from '../../types';
import { IdTracked } from '../batchRequest';
import {
  compose,
  DUMMY_PREPARE,
  DUMMY_SEND_REQUEST,
  DUMMY_STORE,
} from '../process';

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
    DUMMY_PREPARE,
    DUMMY_SEND_REQUEST,
    DUMMY_STORE,
    data,
    Operation.ADD_PROGRAMS_TO_SCHOOL,
    log
  );
}
