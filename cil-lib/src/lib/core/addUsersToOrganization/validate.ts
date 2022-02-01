import { Logger } from 'pino';

import { Context } from '../../..';
import { convertErrorToProtobuf } from '../../errors';
import {
  EntityDoesNotExistError,
  Entity as PbEntity,
  Error as PbError,
  Response,
} from '../../protos';
import { ExternalUuid } from '../../utils';
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
      const result = await validate(d, log);
      valid.push(result.valid);
      for (const i of result.invalid) {
        const resp = new Response()
          .setSuccess(false)
          .setRequestId(d.requestId)
          .setEntity(PbEntity.USER)
          .setEntityId(i)
          .setErrors(
            new PbError().setEntityDoesNotExist(
              new EntityDoesNotExistError().setDetailsList([
                `Unable to find user with id ${i}`,
              ])
            )
          );
        invalid.push(resp);
      }
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

async function validate(
  r: IncomingData,
  log: Logger
): Promise<{ valid: IncomingData; invalid: ExternalUuid[] }> {
  const { protobuf } = r;
  const orgId = protobuf.getExternalOrganizationUuid();
  const ctx = Context.getInstance();
  // Check the target organization is valid
  await ctx.organizationIdIsValid(orgId, log);

  // Check the target users are valid
  // This is an all or nothing
  // @TODO - do we want to make this more lienient
  const { valid, invalid } = await ctx.userIdsAreValid(
    protobuf.getExternalUserUuidsList(),
    log
  );

  // Re-make the initial request with only the valid users
  protobuf.setExternalUserUuidsList(Array.from(valid.keys()));
  r.data.externalUserUuidsList = Array.from(valid.keys());

  // Check the roles are valid
  await ctx.rolesAreValid(protobuf.getRoleIdentifiersList(), orgId, log);
  return { valid: r, invalid };
}
