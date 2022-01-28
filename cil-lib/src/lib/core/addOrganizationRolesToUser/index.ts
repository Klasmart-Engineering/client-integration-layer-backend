import { Logger } from 'pino';

import { AddOrganizationRolesToUser, Response } from '../../protos';
import { Operation } from '../../types';
import { Uuid } from '../../utils';
import { IdTracked } from '../batchRequest';
import {
  compose,
  DUMMY_PREPARE,
  DUMMY_SEND_REQUEST,
  DUMMY_STORE,
} from '../process';

import { validateMany } from './validate';

export interface PAddOrganizationRolesToUser {
  kidsloopOrganizationUuid: Uuid;
  kidsloopUserIds: Uuid;
  roleIds: { id: Uuid; name: string }[];
}

export type IncomingData = IdTracked<
  AddOrganizationRolesToUser,
  PAddOrganizationRolesToUser
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
    Operation.ADD_ORGANIZATION_ROLES_TO_USER,
    log
  );
}
