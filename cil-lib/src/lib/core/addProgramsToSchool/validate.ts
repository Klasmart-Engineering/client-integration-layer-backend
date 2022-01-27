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
        .setEntity(PbEntity.SCHOOL)
        .setEntityId(d.inner.getExternalSchoolUuid())
        .setErrors(e);
      invalid.push(resp);
    }
  }
  return [{ valid, invalid }, log];
}

async function validate(r: IncomingData, log: Logger): Promise<IncomingData> {
  const { inner } = r;
  const schoolId = inner.getExternalSchoolUuid();
  const orgId = inner.getExternalOrganizationUuid();
  await Link.schoolBelongsToOrganization(schoolId, orgId, log);

  const ctx = Context.getInstance();
  await ctx.programsAreValid(inner.getProgramNamesList(), orgId, log);
  return r;
}
