import { Logger } from 'pino';

import { Class } from '../../../database';
import {
  Errors,
  INTERNAL_SERVER_ERROR_PROTOBUF,
  OnboardingError,
} from '../../../errors';
import { Entity, Response } from '../../../protos';
import { requestIdToProtobuf } from '../../batchRequest';

import { IncomingData } from '.';

export async function persist(
  classes: IncomingData[],
  log: Logger
): Promise<Response[]> {
  const responses: Response[] = [];
  for (const incomingData of classes) {
    const clazz = incomingData.data;
    const requestId = incomingData.requestId;

    const response = new Response()
      .setEntity(Entity.CLASS)
      .setEntityId(clazz.externalUuid!)
      .setRequestId(requestIdToProtobuf(requestId));

    try {
      await Class.insertOne(
        clazz.externalUuid!,
        clazz.kidsloopClassUuid!,
        clazz.externalOrganizationUuid!,
        log
      );
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
  return responses;
}
