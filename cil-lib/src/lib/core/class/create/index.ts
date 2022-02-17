import { Logger } from 'pino';

import { Class, Response } from '../../../protos';
import { Operation } from '../../../types';
import { Uuid } from '../../../utils';
import { IdTracked } from '../../batchRequest';
import { compose } from '../../process';

import { sendRequest } from './adminService';
import { persist } from './database';
import { prepare } from './prepare';
import { validateMany } from './validate';

export interface CreateClass {
  kidsloopOrganizationUuid: Uuid;
  kidsloopSchoolUuid: Uuid;
  kidsloopClassUuid: Uuid;
  shortCode?: string;
}

export type IncomingData = IdTracked<Class, CreateClass>;

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
    Operation.CREATE_CLASS,
    log
  );
}
