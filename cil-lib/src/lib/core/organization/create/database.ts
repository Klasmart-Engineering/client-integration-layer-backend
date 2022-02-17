import { Logger } from 'pino';

import { Entity, Response } from '../../../protos';
import { requestIdToProtobuf } from '../../batchRequest';

import { IncomingData } from '.';

export async function toSuccessResponses(
  orgs: IncomingData[],
  _log: Logger
): Promise<Response[]> {
  const responses: Response[] = [];
  for (const org of orgs) {
    const response = new Response()
      .setEntity(Entity.ORGANIZATION)
      .setSuccess(true)
      .setEntityId(org.data.externalUuid || '')
      .setRequestId(requestIdToProtobuf(org.requestId));

    responses.push(response);
  }
  return responses;
}
