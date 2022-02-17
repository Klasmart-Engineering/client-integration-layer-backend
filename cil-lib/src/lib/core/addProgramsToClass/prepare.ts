import { Logger } from 'pino';

import { Context } from '../../../';
import { Class } from '../../database';
import {
  Errors,
  INTERNAL_SERVER_ERROR_PROTOBUF,
  OnboardingError,
  tryGetMember,
} from '../../errors';
import { Entity, Response } from '../../protos';
import { requestIdToProtobuf } from '../batchRequest';
import { Result } from '../process';

import { IncomingData } from '.';

export async function prepare(
  addProgramsToClasses: IncomingData[],
  log: Logger
): Promise<[Result<IncomingData>, Logger]> {
  const ctx = await Context.getInstance();
  const valid = [];
  const invalid: Response[] = [];
  for (const addProgramsToClass of addProgramsToClasses) {
    const { data } = addProgramsToClass;
    try {
      const classId = await ctx.getClassId(
        tryGetMember(data.externalClassUuid, log),
        log
      );
      const schoolId = data.externalSchoolUuid
        ? data.externalSchoolUuid
        : // This is only okay as we've currently validated it in the
          // validate function. If we no longer throw an error if there
          // is more than 1 school, then this is no longer valid
          (await Class.getExternalSchoolIds(data.externalClassUuid!, log))
            .values()
            .next().value;
      const programs = await ctx.programsAreValid(
        tryGetMember(data.programNamesList, log),
        log,
        undefined,
        schoolId
      );
      addProgramsToClass.data.kidsloopClassUuid = classId;
      addProgramsToClass.data.programIds = programs;
      valid.push(addProgramsToClass);
    } catch (error) {
      const response = new Response()
        .setEntity(Entity.CLASS)
        .setRequestId(requestIdToProtobuf(addProgramsToClass.requestId))
        .setEntityId(addProgramsToClass.protobuf.getExternalClassUuid())
        .setSuccess(false);
      if (error instanceof Errors || error instanceof OnboardingError) {
        response.setErrors(error.toProtobufError());
      } else {
        response.setErrors(INTERNAL_SERVER_ERROR_PROTOBUF);
      }
      invalid.push(response);
    }
  }
  return [{ valid, invalid }, log];
}
