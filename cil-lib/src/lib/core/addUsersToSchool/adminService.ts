import { Logger } from 'pino';

import {
  Category,
  INTERNAL_SERVER_ERROR_PROTOBUF,
  MachineError,
  OnboardingError,
} from '../../errors';
import { Entity, Response } from '../../protos';
import { AdminService } from '../../services';
import { AddUsersToSchool } from '../../services/adminService/users';
import { ExternalUuid } from '../../utils';
import { RequestId } from '../batchRequest';
import { Result } from '../process';

import { IncomingData } from '.';

export async function sendRequest(
  operations: IncomingData[],
  log: Logger
): Promise<[Result<IncomingData>, Logger]> {
  const invalid: Response[] = [];
  const usersMapping = new Map<
    string,
    Map<string, { request: RequestId; external: ExternalUuid }>
  >();
  const invalidUsers = new Map<string, Set<string>>();

  const admin = await AdminService.getInstance();

  // This is some nastiness needed because the admin service requires
  // that the school ID is unique within any given batch array
  const requestData: Map<string, AddUsersToSchool>[] = [new Map()];
  for (const op of operations) {
    const kidsloopSchoolId = op.data.externalSchoolUuid!;
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
      for (const r of request) {
        if (!invalidUsers.has(r.schoolId))
          invalidUsers.set(r.schoolId, new Set());
        const s = invalidUsers.get(r.schoolId)!;
        for (const id of r.userIds) s.add(id);
      }
    }
  }
  for (const [school, users] of invalidUsers) {
    const details = usersMapping.get(school)!;
    for (const invalidUser of users) {
      const invalidExternalUser = details.get(invalidUser);
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
        .setEntity(Entity.USER)
        .setEntityId(external)
        .setErrors(INTERNAL_SERVER_ERROR_PROTOBUF);
      invalid.push(resp);
    }
  }
  const ops = operations.filter(
    (op) => op.protobuf.getExternalUserUuidsList().length > 0
  );
  return [{ valid: ops, invalid }, log];
}
