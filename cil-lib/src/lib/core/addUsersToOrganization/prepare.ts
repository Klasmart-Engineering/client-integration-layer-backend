import { Logger } from 'pino';

import { Context } from '../../../';
import {
  Errors,
  INTERNAL_SERVER_ERROR_PROTOBUF,
  OnboardingError,
  tryGetMember,
} from '../../errors';
import { Entity, Response } from '../../protos';
import { Uuid } from '../../utils';
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
      const externalOrgId = tryGetMember(op.data.externalOrganizationUuid, log);
      const orgId = await ctx.getOrganizationId(externalOrgId, log);
      const kidsloopUserIds = await ctx.getUserIds(
        tryGetMember(op.data.externalUserUuidsList, log),
        log
      );
      const roles = await ctx.rolesAreValid(
        tryGetMember(op.data.roleIdentifiersList, log),
        externalOrgId,
        log
      );

      const userIds: { external: Uuid; kidsloop: Uuid }[] = [];
      kidsloopUserIds.valid.forEach((value, key) => {
        userIds.push({ external: key, kidsloop: value });
      });

      op.data.userIds = userIds;
      op.data.organizationUuid = orgId;
      op.data.roleIds = roles;
      valid.push(op);
    } catch (error) {
      if (op.data.externalUserUuidsList!.length === 0)
        op.data.externalUserUuidsList?.map((id) => {
          const response = new Response()
            .setEntity(Entity.USER)
            .setRequestId(requestIdToProtobuf(op.requestId))
            .setEntityId(id)
            .setSuccess(false);
          if (error instanceof Errors || error instanceof OnboardingError) {
            response.setErrors(error.toProtobufError());
          } else {
            response.setErrors(INTERNAL_SERVER_ERROR_PROTOBUF);
          }
          invalid.push(response);
        });
    }
  }
  return [{ valid, invalid }, log];
}
