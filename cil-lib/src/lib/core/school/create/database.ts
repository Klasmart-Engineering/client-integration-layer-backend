import { Logger } from 'pino';

import { School } from '../../../database';
import {
  Errors,
  INTERNAL_SERVER_ERROR_PROTOBUF,
  OnboardingError,
} from '../../../errors';
import { Entity, Response } from '../../../protos';

import { IncomingData } from '.';

export async function persist(
  schools: IncomingData[],
  log: Logger
): Promise<Response[]> {
  const responses: Response[] = [];
  for (const incomingData of schools) {
    const school = incomingData.data;
    const requestId = incomingData.requestId;

    const response = new Response();
    response.setEntity(Entity.SCHOOL);
    response.setEntityId(school.externalUuid!);
    response.setRequestId(requestId);

    const schoolInput = {
      externalUuid: school.externalUuid!,
      klUuid: school.kidsloopSchoolUuid!,
      organization: {
        connect: { externalUuid: school.externalOrganizationUuid },
      },
    };

    try {
      await School.insertOne(schoolInput, log);
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
