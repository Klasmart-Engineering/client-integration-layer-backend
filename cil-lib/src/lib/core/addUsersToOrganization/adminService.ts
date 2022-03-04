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
import { AddUsersToOrganizationInput } from '../../services/adminService/organization';
import { ExternalUuid, Uuid } from '../../utils';
import { retryDupes } from '../../utils/dupe';
import { RequestId, requestIdToProtobuf } from '../batchRequest';
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

    const usersMapping = new Map<
      Uuid,
      Map<Uuid, { request: RequestId; external: ExternalUuid }>
    >();
    const requestData: Map<string, AddUsersToOrganizationInput>[] = [new Map()];

    for (const op of incomingData) {
      const kidsloopOrgId = op.data.organizationUuid!;
      for (const user of op.data.userIds || []) {
        if (!usersMapping.has(kidsloopOrgId))
          usersMapping.set(kidsloopOrgId, new Map());
        const m = usersMapping.get(kidsloopOrgId)!;
        m.set(user.kidsloop, {
          request: op.requestId,
          external: user.external,
        });
      }

      const data = { ...op.data };
      let haveAdded = false;
      const orgId = data.organizationUuid!;
      for (let i = 0; i < requestData.length; i += 1) {
        if (requestData[i].has(orgId)) continue;
        requestData[i].set(orgId, {
          organizationId: orgId,
          organizationRoleIds: data.roleIds!.map(({ id }) => id),
          userIds: data.userIds!.map(({ kidsloop }) => kidsloop),
        });
        haveAdded = true;
        break;
      }
      if (!haveAdded) {
        const m = new Map();
        m.set(orgId, {
          userIds: data.userIds!.map(({ kidsloop }) => kidsloop),
          organizationRoleIds: data.roleIds!.map(({ id }) => id),
          organizationId: orgId,
        });
        requestData.push(m);
      }
    }

    for (const req of requestData) {
      const request = Array.from(req.values());
      const results = await admin.addUsersToOrganizations(request, log);
      for (const result of results) {
        const org = req.get(result.id);
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
    }

    // @TODO - Filter out the invalid entries from Admin service once you get different errors from Admin Service
    // Will work on this in more detail in the future
    const addUsers: Array<{
      orgId: string;
      data: IncomingData;
    }> = [];

    for (const addUsersToOrganization of incomingData) {
      addUsers.push({
        orgId: addUsersToOrganization.data.organizationUuid || 'UNKNOWN',
        data: addUsersToOrganization,
      });
    }

    const addUsersData = addUsers.map(({ data }) => data);
    return [{ valid: Array.from(addUsersData.values()), invalid: [] }, log];
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
