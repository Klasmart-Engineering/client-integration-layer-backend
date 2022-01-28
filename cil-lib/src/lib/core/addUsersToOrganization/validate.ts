import { Logger } from 'pino';

import { Context } from '../../..';
import { convertErrorToProtobuf } from '../../errors';
import { Entity as PbEntity, Response } from '../../protos';
import { Result } from '../process';

import { IncomingData } from '.';

export async function validateMany(
  data: IncomingData[],
  log: Logger
): Promise<[Result<IncomingData>, Logger]> {
  const valid = [];
  const invalid = [];
  for (const d of data) {
    try {
      valid.push(await validate(d, log));
    } catch (error) {
      const e = convertErrorToProtobuf(error, log);
      for (const userId of d.protobuf.getExternalUserUuidsList()) {
        const resp = new Response()
          .setSuccess(false)
          .setRequestId(d.requestId)
          .setEntity(PbEntity.USER)
          .setEntityId(userId)
          .setErrors(e);
        invalid.push(resp);
      }
    }
  }
  return [{ valid, invalid }, log];
}

async function validate(r: IncomingData, log: Logger): Promise<IncomingData> {
  const { protobuf } = r;
  const orgId = protobuf.getExternalOrganizationUuid();
  const ctx = Context.getInstance();
  // Check the target organization is valid
  await ctx.organizationIdIsValid(orgId, log);

  // Check the target users are valid
  // This is an all or nothing
  // @TODO - do we want to make this more lienient
  await ctx.userIdsAreValid(protobuf.getExternalUserUuidsList(), log);

  // Check the roles are valid
  await ctx.rolesAreValid(protobuf.getRoleIdentifiersList(), orgId, log);
  return r;
}
