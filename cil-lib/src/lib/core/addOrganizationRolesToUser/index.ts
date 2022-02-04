import { Logger } from 'pino';

import { AddOrganizationRolesToUser, Response } from '../../protos';
import { Operation } from '../../types';
import { Uuid } from '../../utils';
import { IdTracked } from '../batchRequest';
import { compose } from '../process';

import { sendRequest } from './adminService';
import { toSuccessResponses } from './database';
import { prepare } from './prepare';
import { validateMany } from './validate';

export interface PAddOrganizationRolesToUser {
  kidsloopOrganizationUuid: Uuid;
  kidsloopUserId: Uuid;
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
    prepare,
    sendRequest,
    toSuccessResponses,
    data,
    Operation.ADD_ORGANIZATION_ROLES_TO_USER,
    log
  );
}
