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
import { AdminDupeError } from '../../../services/adminService';
import { retryDupes } from '../../../utils/dupe';
import { requestIdToProtobuf } from '../../batchRequest';
import { Result } from '../../process';

import { IncomingData } from '.';

export async function sendRequest(
  incomingData: IncomingData[],
  log: Logger,
  retry = true
): Promise<[Result<IncomingData>, Logger]> {
  let invalid: Response[] = [];

  try {
    const admin = await AdminService.getInstance();
    const result = await admin.createSchools(
      incomingData.map(({ data }) => ({
        organizationId: data.kidsloopOrganizationUuid!,
        name: data.name!,
        shortCode: data.shortCode,
      })),
      log
    );

    const m = new Map<string, IncomingData>();
    for (const s of incomingData) {
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
    if (error instanceof AdminDupeError && retry) {
      const retryResult = await retryDupes(
        incomingData,
        error,
        invalid,
        sendRequest,
        dupeErrors,
        log
      );
      if (retryResult.hasRetried()) {
        return retryResult.getRetryResult();
      }
      invalid = invalid.concat(retryResult.getInvalid());
    } else {
      for (const s of incomingData) {
        const r = new Response()
          .setEntity(Entity.SCHOOL)
          .setEntityId(s.protobuf.getExternalUuid())
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
  }
  return [{ valid: [], invalid }, log];
}

function dupeErrors(
  error: AdminDupeError,
  incoming: IncomingData[],
  log: Logger
): Result<IncomingData> {
  const errorNames: Map<string, Set<string>> = error.getDupes();
  const retries: IncomingData[] = [];
  const invalid: Response[] = [];
  incoming.forEach((school) => {
    const entityNames =
      errorNames.get(school.data.kidsloopOrganizationUuid!) ?? new Set();

    if (!entityNames.has(school.data.name!)) {
      retries.push(school);
    } else {
      const response = new Response()
        .setEntity(Entity.SCHOOL)
        .setEntityId(school.protobuf.getExternalUuid())
        .setRequestId(requestIdToProtobuf(school.requestId))
        .setErrors(
          new OnboardingError(
            MachineError.ENTITY_ALREADY_EXISTS,
            `school with id ${school.data.externalUuid!} already exists`,
            Category.REQUEST,
            log
          ).toProtobufError()
        )
        .setSuccess(false);
      invalid.push(response);
    }
  });
  return { valid: retries, invalid: invalid };
}
