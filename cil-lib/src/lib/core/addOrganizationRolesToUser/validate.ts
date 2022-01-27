import { Logger } from 'pino';

import { Context, Link } from '../../..';
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
      const resp = new Response()
        .setSuccess(false)
        .setRequestId(d.requestId)
        .setEntity(PbEntity.USER)
        .setEntityId(d.inner.getExternalUserUuid())
        .setErrors(e);
      invalid.push(resp);
    }
  }
  return [{ valid, invalid }, log];
}

async function validate(r: IncomingData, log: Logger): Promise<IncomingData> {
  const { inner } = r;

  const userId = inner.getExternalUserUuid();
  const orgId = inner.getExternalOrganizationUuid();
  // Check that the user already exists in that organization
  await Link.userBelongsToOrganization(userId, orgId, log);

  const ctx = Context.getInstance();
  // Check that the roles are valid for that organization
  await ctx.rolesAreValid(inner.getRoleIdentifiersList(), orgId, log);

  return r;
}
