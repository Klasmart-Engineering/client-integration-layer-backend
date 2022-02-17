import { Logger } from 'pino';

import { AddProgramsToClass, Response } from '../../protos';
import { Operation } from '../../types';
import { ExternalUuid, Uuid } from '../../utils';
import { IdTracked } from '../batchRequest';
import { compose } from '../process';

import { sendRequest } from './adminService';
import { toSuccessResponses } from './database';
import { prepare } from './prepare';
import { validateMany } from './validate';

export interface PAddProgramsToClass {
  externalSchoolUuid: ExternalUuid;
  kidsloopClassUuid: Uuid;
  programIds: { id: Uuid; name: string }[];
}

export type IncomingData = IdTracked<AddProgramsToClass, PAddProgramsToClass>;

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
    Operation.ADD_PROGRAMS_TO_CLASS,
    log
  );
}
