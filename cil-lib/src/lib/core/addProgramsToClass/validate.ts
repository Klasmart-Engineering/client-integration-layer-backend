import { Logger } from 'pino';

import { Class, School } from '../../..';
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
      const resp = new Response()
        .setSuccess(false)
        .setRequestId(d.requestId)
        .setEntity(PbEntity.CLASS)
        .setEntityId(d.inner.getExternalClassUuid())
        .setErrors(e);
      invalid.push(resp);
    }
  }
  return [{ valid, invalid }, log];
}

async function validate(r: IncomingData, log: Logger): Promise<IncomingData> {
  const { inner } = r;

  const classId = inner.getExternalClassUuid();
  const programs = inner.getProgramNamesList();
  const schoolId = (await Class.findOne(classId, log)).externalSchoolUuid;
  const schoolPrograms = await School.getProgramsForSchool(schoolId, log);
  const validPrograms = new Set(schoolPrograms.map((p) => p.name));
  const invalidPrograms = [];
  for (const program of programs) {
    if (validPrograms.has(program)) continue;
    invalidPrograms.push(program);
  }
  if (invalidPrograms.length > 0)
    throw new OnboardingError(
      MachineError.VALIDATION,
      `Programs: ${invalidPrograms.join(
        ', '
      )} do not belong to the parent school ${schoolId}. Any programs associated with a class must be present in their parent school`,
      Category.REQUEST,
      log
    );
  return r;
}
