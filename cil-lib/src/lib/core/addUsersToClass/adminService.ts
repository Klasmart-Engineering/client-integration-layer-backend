import { Logger } from 'pino';

import {
  Errors,
  INTERNAL_SERVER_ERROR_PROTOBUF,
  OnboardingError,
} from '../../errors';
import { Entity, Response } from '../../protos';
import { AdminService } from '../../services';
import {
  AddStudentsToClassInput,
  AddTeachersToClassInput,
} from '../../services/adminService/users';
import { requestIdToProtobuf } from '../batchRequest';
import { Result } from '../process';

import { IncomingData } from '.';

export async function sendRequest(
  input: IncomingData[],
  log: Logger
): Promise<[Result<IncomingData>, Logger]> {
  const invalid: Response[] = [];
  try {
    const admin = await AdminService.getInstance();
    const addStudentsToClass: AddStudentsToClassInput[] = [];
    const addTeachersToClass: AddTeachersToClassInput[] = [];

    input.forEach((value) => {
      const data = value.data;

      if (data.teacherUuids && data.teacherUuids.length > 0) {
        addTeachersToClass.push({
          classId: data.kidsloopClassUuid!,
          teacherIds: data.teacherUuids!.map((id) => id!.kidsloop),
        });
      }

      if (data.studentUuids && data.studentUuids!.length > 0) {
        addStudentsToClass.push({
          classId: data.kidsloopClassUuid!,
          studentIds: data.studentUuids!.map((id) => id!.kidsloop),
        });
      }
    });

    if (addStudentsToClass.length > 0) {
      await admin.addStudentsToClasses(addStudentsToClass, log);
    }

    if (addTeachersToClass.length > 0) {
      await admin.addTeachersToClasses(addTeachersToClass, log);
    }
    return [{ valid: input, invalid: [] }, log];
  } catch (error) {
    for (const addUsers of input) {
      for (const user of [
        ...addUsers.data.externalStudentUuidList!,
        ...addUsers.data.externalTeacherUuidList!,
      ]) {
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
