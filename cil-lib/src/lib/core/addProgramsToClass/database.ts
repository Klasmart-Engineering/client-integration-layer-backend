import { Logger } from 'pino';

import { Entity, Response } from '../../protos';
import { requestIdToProtobuf } from '../batchRequest';

import { IncomingData } from '.';

export async function toSuccessResponses(
  addProgramsToClasses: IncomingData[],
  log: Logger
): Promise<Response[]> {
  const responses: Response[] = [];
  for (const incomingData of addProgramsToClasses) {
    const addProgramsToClass = incomingData.data;
    const requestId = incomingData.requestId;

    const response = new Response()
      .setEntity(Entity.CLASS)
      .setSuccess(true)
      .setEntityId(addProgramsToClass.externalClassUuid!)
      .setRequestId(requestIdToProtobuf(requestId));

    responses.push(response);
  }
  return responses;
}
