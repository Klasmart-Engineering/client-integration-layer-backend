import { Logger } from 'pino';

import { Context, Link } from '../../..';
import { convertErrorToProtobuf } from '../../errors';
import { Entity as PbEntity, Response } from '../../protos';
import { requestIdToProtobuf } from '../batchRequest';
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
      const resp = new Response()
        .setSuccess(false)
        .setRequestId(requestIdToProtobuf(d.requestId))
        .setEntity(PbEntity.USER)
        .setEntityId(d.protobuf.getExternalUserUuid())
        .setErrors(e);
      invalid.push(resp);
    }
  }
  return [{ valid, invalid }, log];
}

async function validate(r: IncomingData, log: Logger): Promise<IncomingData> {
  const { protobuf } = r;

  const userId = protobuf.getExternalUserUuid();
  const orgId = protobuf.getExternalOrganizationUuid();
  // Check that the user already exists in that organization
  await Link.userBelongsToOrganization(userId, orgId, log);

  const ctx = Context.getInstance();
  // Check that the roles are valid for that organization
  await ctx.rolesAreValid(protobuf.getRoleIdentifiersList(), orgId, log);

  return r;
}
