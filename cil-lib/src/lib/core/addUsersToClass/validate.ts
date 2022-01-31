import { Logger } from 'pino';

import { Class, Link } from '../../..';
import {
  Category,
  convertErrorToProtobuf,
  MachineError,
  OnboardingError,
} from '../../errors';
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
      for (const userId of [
        ...d.protobuf.getExternalStudentUuidList(),
        ...d.protobuf.getExternalTeacherUuidList(),
      ]) {
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
  const classId = protobuf.getExternalClassUuid();
  const students = protobuf.getExternalStudentUuidList();
  const teachers = protobuf.getExternalTeacherUuidList();
  const schoolId = (await Class.findOne(classId, log)).externalSchoolUuid;
  const { invalid } = await Link.usersBelongToSchool(
    [...students, ...teachers],
    schoolId,
    log
  );
  if (invalid.length === 0) return r;
  throw new OnboardingError(
    MachineError.VALIDATION,
    `Users: ${invalid.join(
      ', '
    )} do not belong to the same parent school as the class ${classId}. When attempting to add users to a class they must share the same parent school`,
    Category.REQUEST,
    log
  );
}
