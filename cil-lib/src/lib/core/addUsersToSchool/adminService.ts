import { Logger } from 'pino';

import {
  Category,
  Errors,
  INTERNAL_SERVER_ERROR_PROTOBUF,
  MachineError,
  OnboardingError,
} from '../../errors';
import { Entity, Response } from '../../protos';
import { AdminService } from '../../services';
import { requestIdToProtobuf } from '../batchRequest';
import { Result } from '../process';

import { IncomingData } from '.';

export async function sendRequest(
  operations: IncomingData[],
  log: Logger
): Promise<[Result<IncomingData>, Logger]> {
  const invalid: Response[] = [];

  try {
    const admin = await AdminService.getInstance();
    const results = await admin.addUsersToSchools(
      operations.map(({ data }) => ({
        userIds: data.userIds!.map(({ kidsloop }) => kidsloop),
        schoolId: data.kidsloopSchoolUuid!,
      })),
      log
    );

    const schoolsToUpdate = new Map<string, IncomingData>();
    for (const op of operations) {
      schoolsToUpdate.set(op.data.kidsloopSchoolUuid || 'UNKNOWN', op);
    }

    for (const result of results) {
      const school = schoolsToUpdate.get(result.id);
      if (!school) {
        throw new OnboardingError(
          MachineError.WRITE,
          `Somehow managed to update a school with kidsloop id: ${result.id} however it wasn't on our list of entities to update`,
          Category.ADMIN_SERVICE,
          log,
          [],
          {},
          [
            `Please speak to someone in the admin service team, this really shouldn't happen`,
          ]
        );
      }
    }
    return [{ valid: Array.from(schoolsToUpdate.values()), invalid: [] }, log];
  } catch (error) {
    for (const op of operations) {
      for (const u of op.data.userIds || []) {
        const response = new Response()
          .setEntity(Entity.USER)
          .setRequestId(requestIdToProtobuf(op.requestId))
          .setEntityId(u.external)
          .setSuccess(false);
        if (error instanceof Errors || error instanceof OnboardingError) {
          response.setErrors(error.toProtobufError());
        } else {
          response.setErrors(INTERNAL_SERVER_ERROR_PROTOBUF);
        }
        invalid.push(response);
      }
    }
  }
  return [{ valid: [], invalid }, log];
}
