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
  addUsersToOrganizations: IncomingData[],
  log: Logger
): Promise<[Result<IncomingData>, Logger]> {
  const invalid: Response[] = [];

  try {
    const admin = await AdminService.getInstance();
    const results = await admin.addUsersToOrganizations(
      addUsersToOrganizations.map(({ data }) => ({
        organizationId: data.organizationUuid!,
        organizationRoleIds: data.roleIds!.map((role) => role.id),
        userIds: data.userIds!.map((user) => user.kidsloop),
      })),
      log
    );

    const addUsers = new Map<string, IncomingData>();
    for (const addUsersToOrganization of addUsersToOrganizations) {
      addUsers.set(
        addUsersToOrganization.data.organizationUuid || 'UNKNOWN',
        addUsersToOrganization
      );
    }

    for (const result of results) {
      const org = addUsers.get(result.id);
      if (!org) {
        throw new OnboardingError(
          MachineError.WRITE,
          `Didn't link users to the organization: ${result.name}`,
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
    return [{ valid: Array.from(addUsers.values()), invalid: [] }, log];
  } catch (error) {
    for (const addUsers of addUsersToOrganizations) {
      for (const user of addUsers.data.externalUserUuidsList!) {
        const response = new Response()
          .setEntity(Entity.USER)
          .setRequestId(requestIdToProtobuf(addUsers.requestId))
          .setEntityId(user)
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
