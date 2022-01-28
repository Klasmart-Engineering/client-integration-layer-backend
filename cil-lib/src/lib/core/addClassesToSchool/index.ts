import { Logger } from 'pino';

import { Uuid } from '../../..';
import { AddClassesToSchool, Response } from '../../protos';
import { Operation } from '../../types';
import { ExternalUuid } from '../../utils';
import { IdTracked } from '../batchRequest';
import {
  compose,
  DUMMY_PREPARE,
  DUMMY_SEND_REQUEST,
  DUMMY_STORE,
} from '../process';

import { validateMany } from './validate';

export interface PAddClassesToSchool {
  kidsloopSchoolUuid: Uuid;
  kidsloopClassUuids: { kidsloop: Uuid; external: ExternalUuid }[];
}

export type IncomingData = IdTracked<AddClassesToSchool, PAddClassesToSchool>;

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
    Operation.ADD_CLASSES_TO_SCHOOL,
    log
  );
}
