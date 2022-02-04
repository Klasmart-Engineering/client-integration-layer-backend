import { Logger } from 'pino';

import { Entity, Response } from '../../protos';
import { requestIdToProtobuf } from '../batchRequest';

import { IncomingData } from '.';

export async function toSuccessResponses(
  operations: IncomingData[],
  _log: Logger
): Promise<Response[]> {
  return operations.map(({ data: { externalUserUuid }, requestId }) =>
    new Response()
      .setEntity(Entity.USER)
      .setSuccess(true)
      .setEntityId(externalUserUuid || 'UNKNOWN')
      .setRequestId(requestIdToProtobuf(requestId))
  );
}
