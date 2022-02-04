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
  operations: IncomingData[],
  log: Logger
): Promise<[Result<IncomingData>, Logger]> {
  const ctx = Context.getInstance();
  const valid = [];
  const invalid: Response[] = [];
  for (const op of operations) {
    try {
      const externalOrgId = tryGetMember(op.data.externalOrganizationUuid, log);
      const kidsloopOrgId = await ctx.getOrganizationId(externalOrgId, log);
      const kidsloopUserId = await ctx.getUserId(
        tryGetMember(op.data.externalUserUuid, log),
        log
      );
      const roles = await ctx.rolesAreValid(
        tryGetMember(op.data.roleIdentifiersList, log),
        externalOrgId,
        log
      );
      op.data.kidsloopOrganizationUuid = kidsloopOrgId;
      op.data.kidsloopUserId = kidsloopUserId;
      op.data.roleIds = roles;
      valid.push(op);
    } catch (error) {
      const response = new Response()
        .setEntity(Entity.USER)
        .setRequestId(requestIdToProtobuf(op.requestId))
        .setEntityId(op.protobuf.getExternalUserUuid())
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
