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
  addProgramsToSchools: IncomingData[],
  log: Logger
): Promise<[Result<IncomingData>, Logger]> {
  const ctx = Context.getInstance();
  const valid = [];
  const invalid: Response[] = [];
  for (const addProgramsToSchool of addProgramsToSchools) {
    try {
      const externalOrgId = tryGetMember(
        addProgramsToSchool.data.externalOrganizationUuid,
        log
      );
      const orgId = await ctx.getOrganizationId(externalOrgId, log);
      const schoolId = await ctx.getSchoolId(
        tryGetMember(addProgramsToSchool.data.externalSchoolUuid, log),
        log
      );
      const programs = await ctx.programsAreValid(
        tryGetMember(addProgramsToSchool.data.programNamesList, log),
        externalOrgId,
        log
      );
      addProgramsToSchool.data.kidsloopOrganizationUuid = orgId;
      addProgramsToSchool.data.kidsloopSchoolUuid = schoolId;
      addProgramsToSchool.data.programIds = programs;
      valid.push(addProgramsToSchool);
    } catch (error) {
      const response = new Response()
        .setEntity(Entity.SCHOOL)
        .setRequestId(requestIdToProtobuf(addProgramsToSchool.requestId))
        .setEntityId(addProgramsToSchool.protobuf.getExternalSchoolUuid())
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
