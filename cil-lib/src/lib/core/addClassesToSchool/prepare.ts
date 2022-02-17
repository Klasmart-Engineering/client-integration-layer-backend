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
  addClassesToSchools: IncomingData[],
  log: Logger
): Promise<[Result<IncomingData>, Logger]> {
  const ctx = await Context.getInstance();
  const valid = [];
  const invalid: Response[] = [];
  for (const addClassesToSchool of addClassesToSchools) {
    try {
      const externalSchoolId = tryGetMember(
        addClassesToSchool.data.externalSchoolUuid,
        log
      );
      const externalClassIds = tryGetMember(
        addClassesToSchool.protobuf.getExternalClassUuidsList(),
        log
      );
      const kidsloopSchoolId = await ctx.getSchoolId(externalSchoolId, log);

      const kidsloopClassIds = new Map<string, string>();

      for (const externalClassId of externalClassIds) {
        const kidsloopClassId = await ctx.getClassId(externalClassId, log);
        kidsloopClassIds.set(externalClassId, kidsloopClassId);
      }

      addClassesToSchool.data.kidsloopSchoolUuid = kidsloopSchoolId;
      addClassesToSchool.data.kidsloopClassIds = Array.from(
        kidsloopClassIds
      ).map(([external, kidsloop]) => ({
        external,
        kidsloop,
      }));

      valid.push(addClassesToSchool);
    } catch (error) {
      for (const clazz of addClassesToSchool.protobuf.getExternalClassUuidsList()) {
        const response = new Response()
          .setEntity(Entity.CLASS)
          .setRequestId(requestIdToProtobuf(addClassesToSchool.requestId))
          .setEntityId(clazz)
          .setSuccess(false);
        if (error instanceof Errors || error instanceof OnboardingError) {
          response.setErrors(error.toProtobufError());
        } else {
          response.setErrors(INTERNAL_SERVER_ERROR_PROTOBUF);
        }
        invalid.push(response);
      }
    }
  }
  return [{ valid, invalid }, log];
}
