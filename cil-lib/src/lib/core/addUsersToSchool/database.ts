import { Logger } from 'pino';

import { User } from '../../database';
import {
  Errors,
  INTERNAL_SERVER_ERROR_PROTOBUF,
  OnboardingError,
} from '../../errors';
import { Entity, Response } from '../../protos';
import { requestIdToProtobuf } from '../batchRequest';

import { IncomingData } from '.';

export async function persist(
  operations: IncomingData[],
  log: Logger
): Promise<Response[]> {
  const responses: Response[] = [];
  for (const op of operations) {
    const users = op.data.userIds || [];
    try {
      for (const user of users) {
        await User.addUserToSchool(
          user.external,
          op.data.externalSchoolUuid || '',
          log
        );
        responses.push(
          new Response()
            .setEntity(Entity.USER)
            .setSuccess(true)
            .setEntityId(user.external)
            .setRequestId(requestIdToProtobuf(op.requestId))
        );
      }
    } catch (error) {
      for (const user of users) {
        const response = new Response()
          .setEntity(Entity.USER)
          .setRequestId(requestIdToProtobuf(op.requestId))
          .setEntityId(user.external)
          .setSuccess(false);
        if (error instanceof Errors || error instanceof OnboardingError) {
          response.setErrors(error.toProtobufError());
        } else {
          response.setErrors(INTERNAL_SERVER_ERROR_PROTOBUF);
        }
        responses.push(response);
      }
    }
  }
  return responses;
}
