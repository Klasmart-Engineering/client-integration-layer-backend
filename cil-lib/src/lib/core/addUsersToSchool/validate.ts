import { Logger } from 'pino';

import { Context, ExternalUuid, Link } from '../../..';
import { convertErrorToProtobuf } from '../../errors';
import {
  EntityDoesNotExistError,
  Entity as PbEntity,
  Error as PbError,
  Response,
} from '../../protos';
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
  const schoolId = protobuf.getExternalSchoolUuid();

  const ctx = Context.getInstance();
  const userIds = protobuf.getExternalUserUuidsList();
  // check the target users are valid
  const { valid, invalid } = await ctx.userIdsAreValid(userIds, log);

  // Re-make the initial request with only the valid users
  protobuf.setExternalUserUuidsList(Array.from(valid.keys()));
  r.data.externalUserUuidsList = Array.from(valid.keys());

  // Checking that the school ID is valid is covered by this
  await Link.shareTheSameOrganization(log, [schoolId], undefined, userIds);
  return { valid: r, invalid };
}
