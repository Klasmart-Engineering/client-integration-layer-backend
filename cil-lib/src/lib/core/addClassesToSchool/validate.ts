import { Logger } from 'pino';

import { Link } from '../../..';
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
      for (const classId of d.protobuf.getExternalClassUuidsList()) {
        const resp = new Response()
          .setSuccess(false)
          .setRequestId(requestIdToProtobuf(d.requestId))
          .setEntity(PbEntity.CLASS)
          .setEntityId(classId)
          .setErrors(e);
        invalid.push(resp);
      }
    }
  }
  return [{ valid, invalid }, log];
}

async function validate(r: IncomingData, log: Logger): Promise<IncomingData> {
  const { protobuf: protobuf } = r;
  const schoolId = protobuf.getExternalSchoolUuid();
  const classIds = protobuf.getExternalClassUuidsList();

  // Checking that both sets of ids are valid are covered by this
  await Link.shareTheSameOrganization(log, [schoolId], classIds);
  return r;
}
