import { Logger } from 'pino';

import { Entity, Response } from '../../protos';
import { requestIdToProtobuf } from '../batchRequest';

import { IncomingData } from '.';

export async function toSuccessResponses(
  input: IncomingData[],
  _log: Logger
): Promise<Response[]> {
  const responses: Response[] = [];
  for (const incomingData of input) {
    const addUsersToClass = incomingData.data;
    const requestId = incomingData.requestId;

    for (const user of [
      ...addUsersToClass.externalStudentUuidList!,
      ...addUsersToClass.externalTeacherUuidList!,
    ]) {
      const response = new Response()
        .setEntity(Entity.USER)
        .setSuccess(true)
        .setEntityId(user)
        .setRequestId(requestIdToProtobuf(requestId));

      responses.push(response);
    }
  }
  return responses;
}
