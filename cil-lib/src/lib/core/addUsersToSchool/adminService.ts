import { Logger } from 'pino';

import {
  Category,
  INTERNAL_SERVER_ERROR_PROTOBUF,
  MachineError,
  OnboardingError,
} from '../../errors';
import { Entity, Error, Response } from '../../protos';
import { AdminService } from '../../services';
import { AdminDupeError } from '../../services/adminService';
import { AddUsersToSchool } from '../../services/adminService/users';
import { ExternalUuid, Uuid } from '../../utils';
import { RequestId, requestIdToProtobuf } from '../batchRequest';
import { Result } from '../process';

import { IncomingData } from '.';

export async function sendRequest(
  operations: IncomingData[],
  log: Logger,
  retry = true
): Promise<[Result<IncomingData>, Logger]> {
  let invalid: Response[] = [];
  const usersMapping = new Map<
    Uuid,
    Map<Uuid, { request: RequestId; external: ExternalUuid }>
  >();
  const invalidUsers = new Map<
    Uuid,
    Map<Uuid, { kidsloopId: Uuid; error?: Error }>
  >();

  const admin = await AdminService.getInstance();

  // This is some nastiness needed because the admin service requires
  // that the school ID is unique within any given batch array
  const requestData: Map<string, AddUsersToSchool>[] = [new Map()];
  for (const op of operations) {
    const kidsloopSchoolId = op.data.kidsloopSchoolUuid!;
    for (const user of op.data.userIds || []) {
      if (!usersMapping.has(kidsloopSchoolId))
        usersMapping.set(kidsloopSchoolId, new Map());
      const m = usersMapping.get(kidsloopSchoolId)!;
      m.set(user.kidsloop, {
        request: op.requestId,
        external: user.external,
      });
    }

    const data = { ...op.data };
    let haveAdded = false;
    const schoolId = data.kidsloopSchoolUuid!;
    for (let i = 0; i < requestData.length; i += 1) {
      if (requestData[i].has(schoolId)) continue;
      requestData[i].set(schoolId, {
        userIds: data.userIds!.map(({ kidsloop }) => kidsloop),
        schoolId,
      });
      haveAdded = true;
      break;
    }
    if (!haveAdded) {
      const m = new Map();
      m.set(schoolId, {
        userIds: data.userIds!.map(({ kidsloop }) => kidsloop),
        schoolId,
      });
      requestData.push(m);
    }
  }
  for (const requestBatch of requestData) {
    const request = Array.from(requestBatch.values());
    try {
      await admin.addUsersToSchools(request, log);
    } catch (error) {
      if (error instanceof AdminDupeError && retry) {
        const retries = dupeErrors(error, operations, log);

        retries.invalid.forEach((usersWithErrors, schoolId) => {
          const users = invalidUsers.get(schoolId) ?? new Map();

          usersWithErrors.forEach((userWithError) => {
            users.set(userWithError.kidsloopId, userWithError);
          });
          invalidUsers.set(schoolId, users);
        });

        if (retries.valid.length > 0) {
          const result = await sendRequest(retries.valid, log, false);
          const results = result[0];

          const invalid = invalids(invalidUsers, usersMapping, operations, log);
          return [
            { valid: results.valid, invalid: invalid.concat(results.invalid) },
            log,
          ];
        }
      } else {
        for (const r of request) {
          const users = invalidUsers.get(r.schoolId) ?? new Map();
          for (const id of r.userIds) users.set(id, { kidsloopId: id });
          invalidUsers.set(r.schoolId, users);
        }
      }
    }
  }
  invalid = invalid.concat(
    invalids(invalidUsers, usersMapping, operations, log)
  );

  const ops = operations.filter(
    (op) => op.protobuf.getExternalUserUuidsList().length > 0
  );
  return [{ valid: ops, invalid }, log];
}

function invalids(
  invalidUsers: Map<Uuid, Map<Uuid, { kidsloopId: Uuid; error?: Error }>>,
  usersMapping: Map<
    Uuid,
    Map<Uuid, { request: RequestId; external: ExternalUuid }>
  >,
  operations: IncomingData[],
  log: Logger
): Response[] {
  const invalid = [];
  for (const [school, users] of invalidUsers) {
    const details = usersMapping.get(school)!;
    for (const invalidUser of users) {
      const invalidExternalUser = details.get(invalidUser[0]);
      if (!invalidExternalUser) continue;
      const { request, external } = invalidExternalUser;
      const op = operations.filter(
        (r) => r.requestId.id === request.id && r.requestId.n === request.n
      );
      if (op.length !== 1)
        throw new OnboardingError(
          MachineError.APP_CONFIG,
          'Found more than 1 request that matched the given request id',
          Category.APP,
          log
        );
      const operation = op[0];
      const newUserIds = operation.protobuf
        .getExternalUserUuidsList()
        .filter((id) => id !== external);
      const newKidsLoopUserIds = operation.data.userIds?.filter(
        (user) => user.external !== external
      );
      operation.protobuf.setExternalUserUuidsList(newUserIds);
      operation.data.externalUserUuidsList = newUserIds;
      operation.data.userIds = newKidsLoopUserIds;
      const resp = new Response()
        .setSuccess(false)
        .setRequestId(requestIdToProtobuf(operation.requestId))
        .setEntity(Entity.USER)
        .setEntityId(external)
        .setErrors(invalidUser[1].error ?? INTERNAL_SERVER_ERROR_PROTOBUF);
      invalid.push(resp);
    }
  }
  return invalid;
}

function dupeErrors(
  error: AdminDupeError,
  incomingData: IncomingData[],
  log: Logger
): {
  valid: IncomingData[];
  invalid: Map<Uuid, Array<{ kidsloopId: Uuid; error: Error }>>;
} {
  const errorNames: Map<string, Set<string>> = error.getDupes();
  const retries: IncomingData[] = [];
  const invalidMapping: Map<
    Uuid,
    Array<{ kidsloopId: Uuid; error: Error }>
  > = new Map();
  incomingData.forEach((incoming) => {
    const entityNames =
      errorNames.get(incoming.data.kidsloopSchoolUuid!) ?? new Set();

    const retryIds: { external: string; kidsloop: string }[] = [];
    const schoolId = incoming.data.kidsloopSchoolUuid!;
    incoming.data.userIds!.forEach((id) => {
      if (!entityNames.has(id.kidsloop)) {
        retryIds.push(id);
      } else {
        const invalid = invalidMapping.get(schoolId) ?? [];
        invalid.push({
          kidsloopId: id.kidsloop,
          error: new OnboardingError(
            MachineError.ENTITY_ALREADY_EXISTS,
            `user with id ${id.external!} already added to school ${incoming
              .data.externalSchoolUuid!}`,
            Category.REQUEST,
            log
          ).toProtobufError(),
        });
        invalidMapping.set(schoolId, invalid);
      }
    });

    if (retryIds.length > 0) {
      incoming.data.userIds = retryIds;
      const userIds = retryIds.map((id) => id.external);
      incoming.data.externalUserUuidsList = userIds;
      incoming.protobuf.setExternalUserUuidsList(userIds);
      retries.push(incoming);
    }
  });
  return { valid: retries, invalid: invalidMapping };
}
