import { Logger } from 'pino';

import { Class } from '../../../database';
import {
  Errors,
  INTERNAL_SERVER_ERROR_PROTOBUF,
  OnboardingError,
} from '../../../errors';
import { Entity, Response } from '../../../protos';

import { IncomingData } from '.';

export async function persist(
  classes: IncomingData[],
  log: Logger
): Promise<Response[]> {
  const responses: Response[] = [];
  for (const incomingData of classes) {
    const clazz = incomingData.data;
    const requestId = incomingData.requestId;

    const response = new Response();
    response.setEntity(Entity.CLASS);
    response.setEntityId(clazz.externalUuid!);
    response.setRequestId(requestId);

    const classInput = {
      externalUuid: clazz.externalUuid!,
      klUuid: clazz.kidsloopClassUuid!,
      organization: {
        connect: { externalUuid: clazz.externalOrganizationUuid! },
      },
      school: {
        connect: { externalUuid: clazz.externalSchoolUuid! },
      },
    };

    try {
      await Class.insertOne(classInput, log);
      response.setSuccess(true);
      responses.push(response);
    } catch (error) {
      response.setSuccess(false);
      if (error instanceof Errors || error instanceof OnboardingError) {
        response.setErrors(error.toProtobufError());
      } else {
        response.setErrors(INTERNAL_SERVER_ERROR_PROTOBUF);
      }
      responses.push(response);
    }
  }
  return responses;
}
