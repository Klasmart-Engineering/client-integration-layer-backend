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
import { AdminDupeError } from '../../services/adminService';
import { retryDupes } from '../../utils/dupe';
import { requestIdToProtobuf } from '../batchRequest';
import { Result } from '../process';

import { IncomingData } from '.';

export async function sendRequest(
  incomingData: IncomingData[],
  log: Logger,
  retry = true
): Promise<[Result<IncomingData>, Logger]> {
  let invalid: Response[] = [];

  try {
    const admin = await AdminService.getInstance();
    const results = await admin.addUsersToOrganizations(
      incomingData.map(({ data }) => ({
        organizationId: data.organizationUuid!,
        organizationRoleIds: data.roleIds!.map((role) => role.id),
        userIds: data.userIds!.map((user) => user.kidsloop),
      })),
      log
    );

    const addUsers = new Map<string, IncomingData>();
    for (const addUsersToOrganization of incomingData) {
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
      for (const addUsers of incomingData) {
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

  function dupeErrors(
    error: AdminDupeError,
    incomingData: IncomingData[],
    log: Logger
  ): Result<IncomingData> {
    const errorNames: Map<string, Set<string>> = error.getDupes();
    const retries: IncomingData[] = [];
    let invalid: Response[] = [];
    incomingData.forEach((incoming) => {
      const entityNames =
        errorNames.get(incoming.data.organizationUuid!) ?? new Set();

      const retryIds: { external: string; kidsloop: string }[] = [];
      const invalidIds: string[] = [];
      incoming.data.userIds!.forEach((id) => {
        if (!entityNames.has(id.kidsloop)) {
          retryIds.push(id);
        } else {
          invalidIds.push(id.external);
        }
      });

      invalid = invalid.concat(
        invalidIds.map((external) => {
          return new Response()
            .setEntity(Entity.SCHOOL)
            .setEntityId(external)
            .setRequestId(requestIdToProtobuf(incoming.requestId))
            .setErrors(
              new OnboardingError(
                MachineError.ENTITY_ALREADY_EXISTS,
                `user with id ${external!} already added to ${incoming.data
                  .externalOrganizationUuid!}`,
                Category.REQUEST,
                log
              ).toProtobufError()
            )
            .setSuccess(false);
        })
      );

      if (retryIds.length > 0) {
        incoming.data.userIds = retryIds;
        const userIds = retryIds.map((id) => id.external);
        incoming.data.externalUserUuidsList = userIds;
        incoming.protobuf.setExternalUserUuidsList(userIds);
        retries.push(incoming);
      }
    });
    return { valid: retries, invalid: invalid };
  }
}
