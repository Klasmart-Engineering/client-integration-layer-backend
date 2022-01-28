import { Logger } from 'pino';

import { Uuid } from '../../../..';
import { Organization, Response } from '../../../protos';
import { Operation } from '../../../types';
import { IdTracked } from '../../../utils/parseBatchRequests';
import { compose, DUMMY_SEND_REQUEST, DUMMY_STORE } from '../../process';

import { validateMany } from './validate';

type Op = Organization;

export interface KidsLoopOrganization extends ReturnType<Op['toObject']> {
  kidsloopUuid: Uuid;
}

export type IncomingData = IdTracked<Op, KidsLoopOrganization>;

export function process(
  data: IncomingData[],
  log: Logger
): Promise<Response[]> {
  return compose(
    validateMany,
    DUMMY_SEND_REQUEST,
    DUMMY_STORE,
    data,
    Operation.CREATE_ORGANIZATION,
    log
  );
}
