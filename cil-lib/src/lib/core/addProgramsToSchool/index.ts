import { Logger } from 'pino';

import { AddProgramsToSchool, Response } from '../../protos';
import { Operation } from '../../types';
import { IdTracked } from '../../utils/parseBatchRequests';
import { compose, DUMMY_SEND_REQUEST, DUMMY_STORE } from '../process';

import { validateMany } from './validate';

export type IncomingData = IdTracked<AddProgramsToSchool>;

export function process(
  data: IncomingData[],
  log: Logger
): Promise<Response[]> {
  return compose(
    validateMany,
    DUMMY_SEND_REQUEST,
    DUMMY_STORE,
    data,
    Operation.ADD_PROGRAMS_TO_SCHOOL,
    log
  );
}
