import { Logger } from 'pino';

import { Entity, Response } from '../../protos';
import { requestIdToProtobuf } from '../batchRequest';

import { IncomingData } from '.';

export async function toSuccessResponses(
  addClassesToSchools: IncomingData[],
  _log: Logger
): Promise<Response[]> {
  const responses: Response[] = [];

  for (const incomingData of addClassesToSchools) {
    const addClassesToSchool = incomingData.data;
    const requestId = incomingData.requestId;
    const classIds = addClassesToSchool.externalClassUuidsList || [];

    for (const classId of classIds) {
      const response = new Response()
        .setEntity(Entity.CLASS)
        .setSuccess(true)
        .setEntityId(classId)
        .setRequestId(requestIdToProtobuf(requestId));

      responses.push(response);
    }
  }
  return responses;
}
