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
  addProgramsToSchools: IncomingData[],
  log: Logger
): Promise<Response[]> {
  const responses: Response[] = [];
  for (const incomingData of addProgramsToSchools) {
    try {
      const addProgramsToSchool = incomingData.data;
      const requestId = incomingData.requestId;
      const schoolId = addProgramsToSchool.kidsloopSchoolUuid!;
      for (const program of addProgramsToSchool.programIds!) {
        await Link.linkProgramToSchool(program.id, schoolId, log);
      }
      const response = new Response()
        .setEntity(Entity.SCHOOL)
        .setSuccess(true)
        .setEntityId(schoolId ?? '')
        .setRequestId(requestIdToProtobuf(requestId));

      responses.push(response);
    } catch (error) {
      const resp = new Response()
        .setEntity(Entity.SCHOOL)
        .setSuccess(false)
        .setEntityId(incomingData.data.kidsloopSchoolUuid ?? '')
        .setRequestId(requestIdToProtobuf(incomingData.requestId));
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
