import { Prisma } from '@prisma/client';
import { Logger } from 'pino';

import { User } from '../../../database';
import {
  Errors,
  INTERNAL_SERVER_ERROR_PROTOBUF,
  OnboardingError,
} from '../../../errors';
import { Entity, Response } from '../../../protos';
import { requestIdToProtobuf } from '../../batchRequest';

import { IncomingData } from '.';

export async function persist(
  users: IncomingData[],
  log: Logger
): Promise<Response[]> {
  const responses: Response[] = [];
  const dbInputs: Prisma.UserCreateInput[] = users.map((u) => ({
    externalUuid: u.data.externalUuid!,
    klUuid: u.data.kidsloopUserUuid!,
  }));

  try {
    await User.insertMany(dbInputs, log);
    for (const u of users) {
      const resp = new Response()
        .setEntity(Entity.USER)
        .setSuccess(true)
        .setEntityId(u.data.externalUuid!)
        .setRequestId(requestIdToProtobuf(u.requestId));
      responses.push(resp);
    }
  } catch (error) {
    for (const u of users) {
      const resp = new Response()
        .setEntity(Entity.USER)
        .setSuccess(false)
        .setEntityId(u.data.externalUuid!)
        .setRequestId(requestIdToProtobuf(u.requestId));
      if (error instanceof Errors || error instanceof OnboardingError) {
        resp.setErrors(error.toProtobufError());
      } else {
        resp.setErrors(INTERNAL_SERVER_ERROR_PROTOBUF);
      }
      responses.push(resp);
    }
  }
  return responses;
}
