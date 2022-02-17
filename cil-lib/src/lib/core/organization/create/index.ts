import { Logger } from 'pino';

import { Uuid } from '../../../..';
import { Organization, Response } from '../../../protos';
import { Operation } from '../../../types';
import { IdTracked } from '../../batchRequest';
import { compose, NOOP } from '../../process';

import { sendRequest } from './adminService';
import { toSuccessResponses } from './database';
import { validateMany } from './validate';

export interface CreateOrganization {
  kidsloopOrganizationUuid: Uuid;
}

export type IncomingData = IdTracked<Organization, CreateOrganization>;

export function process(
  data: IncomingData[],
  log: Logger
): Promise<Response[]> {
  return compose(
    validateMany,
    NOOP,
    sendRequest,
    toSuccessResponses,
    data,
    Operation.CREATE_ORGANIZATION,
    log
  );
}
