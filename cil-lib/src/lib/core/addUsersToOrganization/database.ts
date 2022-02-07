import { Logger } from 'pino';

import { Link } from '../../database';
import {
  Errors,
  INTERNAL_SERVER_ERROR_PROTOBUF,
  OnboardingError,
} from '../../errors';
import { Entity, Response } from '../../protos';
import { requestIdToProtobuf } from '../batchRequest';

import { IncomingData } from '.';

export async function persist(
  addUsersToOrgs: IncomingData[],
  log: Logger
): Promise<Response[]> {
  const responses: Response[] = [];
  for (const incomingData of addUsersToOrgs) {
    const addUsersToOrg = incomingData.data;
    const requestId = incomingData.requestId;
    for (const user of addUsersToOrg.userIds!) {
      try {
        await Link.linkUserToOrg(
          user.kidsloop,
          incomingData.data.organizationUuid!,
          log
        );
        const response = new Response()
          .setEntity(Entity.USER)
          .setSuccess(true)
          .setEntityId(user.external)
          .setRequestId(requestIdToProtobuf(requestId));

        responses.push(response);
      } catch (error) {
        const resp = new Response()
          .setEntity(Entity.USER)
          .setSuccess(false)
          .setEntityId(user.external)
          .setRequestId(requestIdToProtobuf(incomingData.requestId));
        if (error instanceof Errors || error instanceof OnboardingError) {
          resp.setErrors(error.toProtobufError());
        } else {
          resp.setErrors(INTERNAL_SERVER_ERROR_PROTOBUF);
        }
        responses.push(resp);
      }
    }
  }
  return responses;
}
