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
  const schoolId = protobuf.getExternalSchoolUuid();

  const ctx = Context.getInstance();
  const userIds = protobuf.getExternalUserUuidsList();
  // check the target users are valid
  await ctx.userIdsAreValid(userIds, log);

  // Checking that the school ID is valid is covered by this
  await Link.shareTheSameOrganization(log, [schoolId], undefined, userIds);
  return r;
}
