import { Logger } from 'pino';

import { Uuid } from '../../../..';
import { Organization, Response } from '../../../protos';
import { Operation } from '../../../types';
import { IdTracked } from '../../batchRequest';
import { compose, DUMMY_SEND_REQUEST, DUMMY_STORE, NOOP } from '../../process';

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
    DUMMY_SEND_REQUEST,
    DUMMY_STORE,
    data,
    Operation.CREATE_ORGANIZATION,
    log
  );
}
