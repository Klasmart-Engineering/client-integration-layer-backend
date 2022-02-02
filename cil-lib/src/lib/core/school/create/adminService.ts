import { Logger } from 'pino';

import {
  Category,
  Errors,
  INTERNAL_SERVER_ERROR_PROTOBUF,
  MachineError,
  OnboardingError,
} from '../../../errors';
import { Entity, Response } from '../../../protos';
import { AdminService } from '../../../services';
import { requestIdToProtobuf } from '../../batchRequest';
import { Result } from '../../process';

import { IncomingData } from '.';

export async function sendRequest(
  schools: IncomingData[],
  log: Logger
): Promise<[Result<IncomingData>, Logger]> {
  const invalid: Response[] = [];

  try {
    const admin = await AdminService.getInstance();
    const result = await admin.createSchools(
      schools.map(({ data }) => ({
        organizationId: data.kidsloopOrganizationUuid!,
        name: data.name!,
        shortCode: data.shortCode,
      })),
      log
    );

    const m = new Map<string, IncomingData>();
    for (const s of schools) {
      m.set(s.data.name || 'UNKNOWN', s);
    }

    for (const s of result) {
      const school = m.get(s.name);
      if (!school)
        throw new OnboardingError(
          MachineError.WRITE,
          `Received a school name that we didn't try and add ${s.name}`,
          Category.ADMIN_SERVICE,
          log,
          [],
          {},
          [
            `Please speak to someone in the admin service team, this really shouldn't happen`,
          ]
        );
      school.data.kidsloopSchoolUuid = s.id;
    }
    return [{ valid: Array.from(m.values()), invalid: [] }, log];
  } catch (error) {
    // @TODO - We need to filter out any invalid entities or entities that
    // already exist and retry
    for (const s of schools) {
      const r = new Response()
        .setEntity(Entity.SCHOOL)
        .setRequestId(requestIdToProtobuf(s.requestId))
        .setSuccess(false);
      if (error instanceof Errors || error instanceof OnboardingError) {
        r.setErrors(error.toProtobufError());
      } else {
        r.setErrors(INTERNAL_SERVER_ERROR_PROTOBUF);
      }
      invalid.push(r);
    }
  }

  return [{ valid: [], invalid }, log];
}
