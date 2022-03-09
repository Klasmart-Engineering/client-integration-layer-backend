import { Logger } from 'pino';

import { Class, Link } from '../../..';
import {
  Category,
  convertErrorToProtobuf,
  MachineError,
  OnboardingError,
} from '../../errors';
import { Entity as PbEntity, Response } from '../../protos';
import { requestIdToProtobuf } from '../batchRequest';
import { Result } from '../process';

import { IncomingData } from '.';

export async function validateMany(
  data: IncomingData[],
  log: Logger
): Promise<[Result<IncomingData>, Logger]> {
  const validRequests = [];
  let invalidRequests: Response[] = [];
  for (const d of data) {
    try {
      const { valid, invalid } = await validate(d, log);
      if (valid !== null) validRequests.push(valid);
      invalidRequests = invalidRequests.concat(invalid);
    } catch (error) {
      const e = convertErrorToProtobuf(error, log);
      for (const userId of [
        ...d.protobuf.getExternalStudentUuidList(),
        ...d.protobuf.getExternalTeacherUuidList(),
      ]) {
        const resp = new Response()
          .setSuccess(false)
          .setRequestId(requestIdToProtobuf(d.requestId))
          .setEntity(PbEntity.USER)
          .setEntityId(userId)
          .setErrors(e);
        invalidRequests.push(resp);
      }
    }
  }
  return [{ valid: validRequests, invalid: invalidRequests }, log];
}

async function validate(
  r: IncomingData,
  log: Logger
): Promise<{ valid: IncomingData | null; invalid: Response[] }> {
  const { protobuf } = r;
  const classId = protobuf.getExternalClassUuid();
  const students = protobuf.getExternalStudentUuidList();
  const teachers = protobuf.getExternalTeacherUuidList();
  const schoolIds = await Class.getExternalSchoolIds(classId, log);
  if (schoolIds.size > 1)
    throw new OnboardingError(
      MachineError.APP_CONFIG,
      `We currently don't support adding a class to more than 1 school`,
      Category.APP,
      log,
      [],
      {},
      ['Talk to someone in the CSI team if you think we need to support this']
    );

  const invalidResponses = [];
  const schoolId = schoolIds.values().next().value;

  // Process Students
  {
    const { valid, invalid } = await Link.usersBelongToSchool(
      students,
      schoolId,
      log
    );
    r.protobuf.setExternalStudentUuidList(valid);
    r.data.externalStudentUuidList = valid;
    for (const id of invalid) {
      const resp = new Response()
        .setSuccess(false)
        .setRequestId(requestIdToProtobuf(r.requestId))
        .setEntity(PbEntity.USER)
        .setEntityId(id)
        .setErrors(
          new OnboardingError(
            MachineError.VALIDATION,
            `Student: ${id} can not be added to class ${classId} as they do not share the same parent school`,
            Category.REQUEST,
            log
          ).toProtobufError()
        );
      invalidResponses.push(resp);
    }
  }

  // Process Teachers
  {
    const { valid, invalid } = await Link.usersBelongToSchool(
      teachers,
      schoolId,
      log
    );
    r.protobuf.setExternalTeacherUuidList(valid);
    r.data.externalTeacherUuidList = valid;
    for (const id of invalid) {
      const resp = new Response()
        .setSuccess(false)
        .setRequestId(requestIdToProtobuf(r.requestId))
        .setEntity(PbEntity.USER)
        .setEntityId(id)
        .setErrors(
          new OnboardingError(
            MachineError.VALIDATION,
            `Teacher: ${id} can not be added to class ${classId} as they do not share the same parent school`,
            Category.REQUEST,
            log
          ).toProtobufError()
        );
      invalidResponses.push(resp);
    }
  }
  const valid =
    r.data.externalStudentUuidList.length === 0 &&
    r.data.externalTeacherUuidList.length === 0
      ? null
      : r;

  return { valid, invalid: invalidResponses };
}
