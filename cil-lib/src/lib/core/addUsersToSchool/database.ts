import { Logger } from 'pino';

import { User } from '../../database';
import {
  Errors,
  INTERNAL_SERVER_ERROR_PROTOBUF,
  OnboardingError,
  tryGetMember,
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
    const schoolId = tryGetMember(op.data.externalSchoolUuid, log);
    for (const { external } of users) {
      const response = new Response()
        .setEntity(Entity.USER)
        .setEntityId(external)
        .setRequestId(requestIdToProtobuf(op.requestId));
      try {
        await User.addUserToSchool(external, schoolId, log);
        response.setSuccess(true);
      } catch (error) {
        response.setSuccess(false);
        if (error instanceof Errors || error instanceof OnboardingError) {
          response.setErrors(error.toProtobufError());
        } else {
          response.setErrors(INTERNAL_SERVER_ERROR_PROTOBUF);
        }
      } finally {
        responses.push(response);
      }
    }
  }
  return responses;
}
