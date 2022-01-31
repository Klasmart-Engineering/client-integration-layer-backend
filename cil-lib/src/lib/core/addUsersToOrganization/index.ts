import { Logger } from 'pino';

import { AddUsersToOrganization, Response } from '../../protos';
import { Operation } from '../../types';
import { ExternalUuid, Uuid } from '../../utils';
import { IdTracked } from '../batchRequest';
import {
  compose,
  DUMMY_PREPARE,
  DUMMY_SEND_REQUEST,
  DUMMY_STORE,
} from '../process';

import { validateMany } from './validate';

export interface PAddUsersToOrganization {
  externalOrganizationUuid: string;
  roleIds: { name: string; id: Uuid }[];
  userIds: { external: ExternalUuid; kidsloop: Uuid }[];
}

export type IncomingData = IdTracked<
  AddUsersToOrganization,
  PAddUsersToOrganization
>;

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
    Operation.ADD_USERS_TO_ORGANIZATION,
    log
  );
}
