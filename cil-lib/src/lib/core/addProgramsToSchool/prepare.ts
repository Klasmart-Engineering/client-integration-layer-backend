import { Logger } from 'pino';

import { Context } from '../../../';
import { School } from '../../database';
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
  const ctx = await Context.getInstance();
  const valid = [];
  const invalid: Response[] = [];
  for (const addProgramsToSchool of addProgramsToSchools) {
    const { data } = addProgramsToSchool;
    try {
      const schoolId = await ctx.getSchoolId(
        tryGetMember(data.externalSchoolUuid, log),
        log
      );
      const externalOrgId = data.externalOrganizationUuid
        ? data.externalOrganizationUuid
        : await School.getExternalOrgId(schoolId, log);
      const orgId = await ctx.getOrganizationId(externalOrgId, log);
      const programs = await ctx.programsAreValid(
        tryGetMember(data.programNamesList, log),
        log,
        externalOrgId
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
