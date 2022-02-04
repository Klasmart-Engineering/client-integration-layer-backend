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
    const results = await admin.addOrganizationRolesToUser(
      operations.map(({ data }) => ({
        userId: data.kidsloopUserId!,
        organizationId: data.kidsloopOrganizationUuid!,
        roleIds: data.roleIds!.map((r) => r.id),
      })),
      log
    );

    const usersToUpdate = new Map<string, IncomingData>();
    for (const user of operations) {
      usersToUpdate.set(user.data.kidsloopUserId || 'UNKNOWN', user);
    }

    for (const result of results) {
      const user = usersToUpdate.get(result.id);
      if (!user) {
        throw new OnboardingError(
          MachineError.WRITE,
          `Somehow managed to add roles to a user with kidsloop id: ${result.id} however that user wasn't on our update list`,
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
    return [{ valid: Array.from(usersToUpdate.values()), invalid: [] }, log];
  } catch (error) {
    for (const op of operations) {
      const response = new Response()
        .setEntity(Entity.USER)
        .setRequestId(requestIdToProtobuf(op.requestId))
        .setEntityId(op.protobuf.getExternalUserUuid())
        .setSuccess(false);
      if (error instanceof Errors || error instanceof OnboardingError) {
        response.setErrors(error.toProtobufError());
      } else {
        response.setErrors(INTERNAL_SERVER_ERROR_PROTOBUF);
      }
      invalid.push(response);
    }
  }
  return [{ valid: [], invalid }, log];
}
