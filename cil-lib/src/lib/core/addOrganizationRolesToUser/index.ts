import { Logger } from 'pino';

import { AddOrganizationRolesToUser, Response } from '../../protos';
import { Operation } from '../../types';
import { IdTracked } from '../../utils/parseBatchRequests';
import { compose, DUMMY_SEND_REQUEST, DUMMY_STORE } from '../process';

import { validateMany } from './validate';

export type IncomingData = IdTracked<AddOrganizationRolesToUser>;

export function process(
  data: IncomingData[],
  log: Logger
): Promise<Response[]> {
  return compose(
    validateMany,
    DUMMY_SEND_REQUEST,
    DUMMY_STORE,
    data,
    Operation.ADD_ORGANIZATION_ROLES_TO_USER,
    log
  );
}
