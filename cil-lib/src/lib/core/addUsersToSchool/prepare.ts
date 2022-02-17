import { Logger } from 'pino';

import { Context } from '../../..';
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
  operations: IncomingData[],
  log: Logger
): Promise<[Result<IncomingData>, Logger]> {
  const ctx = await Context.getInstance();
  const valid = [];
  const invalid: Response[] = [];
  for (const op of operations) {
    try {
      const externalSchoolId = tryGetMember(op.data.externalSchoolUuid, log);
      const kidsloopSchoolId = await ctx.getSchoolId(externalSchoolId, log);
      const kidsloopUserIds = await ctx.getUserIds(
        op.protobuf.getExternalUserUuidsList(),
        log
      );
      // @TODO - In the future we'll take role IDs and have to handle this here
      op.data.kidsloopSchoolUuid = kidsloopSchoolId;
      op.data.userIds = Array.from(kidsloopUserIds.valid.entries()).map(
        ([external, kidsloop]) => ({
          external,
          kidsloop,
        })
      );
      /* op.data.roleIds = ... @TODO */
      valid.push(op);
    } catch (error) {
      for (const u of op.protobuf.getExternalUserUuidsList()) {
        const response = new Response()
          .setEntity(Entity.USER)
          .setRequestId(requestIdToProtobuf(op.requestId))
          .setEntityId(u)
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
