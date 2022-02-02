import { Logger } from 'pino';

import { Context } from '../../../';
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
  const ctx = Context.getInstance();
  const valid = [];
  const invalid: Response[] = [];
  for (const addProgramsToClass of addProgramsToClasses) {
    try {
      const externalOrgId = tryGetMember(
        addProgramsToClass.data.externalOrganizationUuid,
        log
      );
      const orgId = await ctx.getOrganizationId(externalOrgId, log);
      const classId = await ctx.getClassId(
        tryGetMember(addProgramsToClass.data.externalClassUuid, log),
        log
      );
      const programs = await ctx.programsAreValid(
        tryGetMember(addProgramsToClass.data.programNamesList, log),
        externalOrgId,
        log
      );
      addProgramsToClass.data.kidsloopOrganizationUuid = orgId;
      addProgramsToClass.data.kidsloopClassUuid = classId;
      addProgramsToClass.data.programIds = programs;
      valid.push(addProgramsToClass);
    } catch (error) {
      const response = new Response()
        .setEntity(Entity.CLASS)
        .setRequestId(requestIdToProtobuf(addProgramsToClass.requestId))
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
