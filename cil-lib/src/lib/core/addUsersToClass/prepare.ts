import { Logger } from 'pino';

import { Context } from '../../../';
import {
  ENTITY_NOT_FOUND,
  Errors,
  INTERNAL_SERVER_ERROR_PROTOBUF,
  OnboardingError,
  tryGetMember,
} from '../../errors';
import { Entity as PBEntity, Response } from '../../protos';
import { Entity } from '../../types';
import { ExternalUuid, Uuid } from '../../utils';
import { requestIdToProtobuf } from '../batchRequest';
import { Result } from '../process';

import { IncomingData } from '.';

export async function prepare(
  input: IncomingData[],
  log: Logger
): Promise<[Result<IncomingData>, Logger]> {
  const ctx = await Context.getInstance();
  const valid = [];
  const invalid: Response[] = [];
  for (const addUsersToClass of input) {
    try {
      const classId = await ctx.getClassId(
        tryGetMember(addUsersToClass.data.externalClassUuid, log),
        log
      );
      const externalStudentIds = new Set(
        addUsersToClass.data.externalStudentUuidList!
      );
      const externalTeacherIds = new Set(
        addUsersToClass.data.externalTeacherUuidList!
      );
      const users = await ctx.getUserIds(
        [...externalStudentIds, ...externalTeacherIds],
        log
      );

      if (users.invalid.length > 0) {
        users.invalid.forEach((id) => {
          invalid.push(
            new Response()
              .setEntity(PBEntity.USER)
              .setRequestId(requestIdToProtobuf(addUsersToClass.requestId))
              .setEntityId(id)
              .setErrors(
                ENTITY_NOT_FOUND(id, Entity.USER, log).toProtobufError()
              )
              .setSuccess(false)
          );
        });
      }

      const studentIds: { external: ExternalUuid; kidsloop: Uuid }[] = [];
      const teacherIds: { external: ExternalUuid; kidsloop: Uuid }[] = [];

      users.valid.forEach((kidsloopId: string, externalId: string) => {
        if (externalStudentIds.has(externalId)) {
          studentIds.push({ external: externalId, kidsloop: kidsloopId });
        }
        if (externalTeacherIds.has(externalId)) {
          teacherIds.push({ external: externalId, kidsloop: kidsloopId });
        }
      });

      addUsersToClass.data.kidsloopClassUuid = classId;
      addUsersToClass.data.studentUuids = studentIds;
      addUsersToClass.data.teacherUuids = teacherIds;
      valid.push(addUsersToClass);
    } catch (error) {
      [
        ...addUsersToClass.data.studentUuids!,
        ...addUsersToClass.data.teacherUuids!,
      ].forEach((userId) => {
        const response = new Response()
          .setEntity(PBEntity.USER)
          .setRequestId(requestIdToProtobuf(addUsersToClass.requestId))
          .setEntityId(userId.external)
          .setSuccess(false);

        if (error instanceof Errors || error instanceof OnboardingError) {
          response.setErrors(error.toProtobufError());
        } else {
          response.setErrors(INTERNAL_SERVER_ERROR_PROTOBUF);
        }
        invalid.push(response);
      });
    }
  }
  return [{ valid, invalid }, log];
}
