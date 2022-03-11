import { Logger } from 'pino';

import { ExternalUuid, Uuid } from '../../..';
import {
  Category,
  Errors,
  INTERNAL_SERVER_ERROR_PROTOBUF,
  MachineError,
  OnboardingError,
} from '../../errors';
import { Entity, Error, Response } from '../../protos';
import { AdminService } from '../../services';
import { AdminDupeError } from '../../services/adminService';
import {
  AddStudentsToClassInput,
  AddTeachersToClassInput,
} from '../../services/adminService/users';
import { RequestId, requestIdToProtobuf } from '../batchRequest';
import { Result } from '../process';

import { IncomingData } from '.';

const getRequestKey = ({ id, n }: RequestId): string => `${id}||${n}`;
const MAX_PER_ARRAY_CAP = 50;

export async function sendRequest(
  input: IncomingData[],
  log: Logger
): Promise<[Result<IncomingData>, Logger]> {
  const invalid: Response[] = [];
  try {
    const result = await processWhileChunking(input, log);
    return [result, log];
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

async function processWhileChunking(
  data: IncomingData[],
  log: Logger
): Promise<{ valid: IncomingData[]; invalid: Response[] }> {
  let invalidTeachers: Response[] = [];
  let invalidStudents: Response[] = [];
  const studentsRequests: Map<string, AddStudentsToClassInput>[] = [new Map()];
  const teachersRequests: Map<string, AddTeachersToClassInput>[] = [new Map()];
  const studentsIndexChecker = new Map<string, number>();
  const teachersIndexChecker = new Map<string, number>();
  const ops = new Map<string, IncomingData>();
  const internalToExternal = new Map<
    Uuid,
    { requestId: string; external: ExternalUuid }
  >();

  for (const d of data) {
    const classId = d.data.kidsloopClassUuid!;
    const students = d.data.studentUuids || [];
    const teachers = d.data.teacherUuids || [];
    if (students.length > 0)
      addChunkToRequests(
        classId,
        students,
        studentsRequests,
        studentsIndexChecker,
        'studentIds'
      );

    if (teachers.length > 0)
      addChunkToRequests(
        classId,
        teachers,
        teachersRequests,
        teachersIndexChecker,
        'teacherIds'
      );

    const key = getRequestKey(d.requestId);
    ops.set(key, d);
    for (const id of [...students, ...teachers]) {
      internalToExternal.set(id.kidsloop, {
        requestId: key,
        external: id.external,
      });
    }
  }

  const admin = await AdminService.getInstance();

  for (const studentRequest of studentsRequests) {
    const addStudentsToClasses = Array.from(studentRequest.values());
    if (addStudentsToClasses.length === 0) continue;
    try {
      await admin.addStudentsToClasses(addStudentsToClasses, log);
    } catch (error) {
      if (error instanceof AdminDupeError) {
        const retries = studentDupeErrors(error, addStudentsToClasses);

        invalidStudents = invalidStudents.concat(
          toStudentDupeErrorResponses(
            retries.invalidIds,
            internalToExternal,
            ops,
            log
          )
        );

        if (retries.valid.length > 0) {
          try {
            await admin.addStudentsToClasses(retries.valid, log);
          } catch (error) {
            log.error(
              `Failed when attempting to retry de-duped add students to a class in the admin service`
            );
            invalidStudents.concat(
              studentsToClassesInternalErrors(
                retries.valid,
                internalToExternal,
                ops
              )
            );
          }
        }
      } else {
        log.error(
          `Failed when attempting to add a chunked batch of students to a class in the admin service`
        );
        invalidStudents.concat(
          studentsToClassesInternalErrors(
            addStudentsToClasses,
            internalToExternal,
            ops
          )
        );
      }
    }
  }
  for (const teacherRequest of teachersRequests) {
    const addTeachersToClasses = Array.from(teacherRequest.values());
    if (addTeachersToClasses.length === 0) continue;
    try {
      await admin.addTeachersToClasses(addTeachersToClasses, log);
    } catch (error) {
      if (error instanceof AdminDupeError) {
        const retries = teacherDupeErrors(error, addTeachersToClasses);

        invalidTeachers = invalidTeachers.concat(
          toTeacherDupeErrorResponses(
            retries.invalidIds,
            internalToExternal,
            ops,
            log
          )
        );

        if (retries.valid.length > 0) {
          try {
            await admin.addTeachersToClasses(retries.valid, log);
          } catch (error) {
            log.error(
              `Failed when attempting to retry de-duped add teachers to a class in the admin service`
            );
            invalidTeachers = invalidTeachers.concat(
              teachersToClassesInternalErrors(
                retries.valid,
                internalToExternal,
                ops
              )
            );
          }
        }
      } else {
        log.error(
          `Failed when attempting to add a chunked batch of teachers to a class in the admin service`
        );
        invalidTeachers = invalidTeachers.concat(
          teachersToClassesInternalErrors(
            addTeachersToClasses,
            internalToExternal,
            ops
          )
        );
      }
    }
  }
  const invalidTeacherExternalUserIds = new Set(
    invalidTeachers.map((resp) => resp.getEntityId())
  );
  const invalidStudentExternalUserIds = new Set(
    invalidStudents.map((resp) => resp.getEntityId())
  );

  return {
    valid: validOps(
      ops,
      invalidTeacherExternalUserIds,
      invalidStudentExternalUserIds
    ),
    invalid: invalidTeachers.concat(invalidStudents),
  };
}

function toTeacherDupeErrorResponses(
  invalidIds: Set<Uuid>,
  internalToExternal: Map<
    string,
    { requestId: string; external: ExternalUuid }
  >,
  ops: Map<string, IncomingData>,
  log: Logger
): Response[] {
  return toDupeErrorResponses(
    invalidIds,
    internalToExternal,
    ops,
    'teacher',
    log
  );
}

function toStudentDupeErrorResponses(
  invalidIds: Set<Uuid>,
  internalToExternal: Map<
    string,
    { requestId: string; external: ExternalUuid }
  >,
  ops: Map<string, IncomingData>,
  log: Logger
): Response[] {
  return toDupeErrorResponses(
    invalidIds,
    internalToExternal,
    ops,
    'student',
    log
  );
}

function toDupeErrorResponses(
  invalidIds: Set<Uuid>,
  internalToExternal: Map<
    string,
    { requestId: string; external: ExternalUuid }
  >,
  ops: Map<string, IncomingData>,
  user: 'teacher' | 'student',
  log: Logger
): Response[] {
  return Array.from(invalidIds)
    .filter((teacherId) => internalToExternal.has(teacherId))
    .filter((teacherId) => {
      const mapping = internalToExternal.get(teacherId);
      return ops.has(mapping!.requestId);
    })
    .map((id) => {
      const mapping = internalToExternal.get(id)!;
      const op = ops.get(mapping!.requestId)!;

      return entityAlreadyExistsError(
        op.requestId,
        mapping.external,
        op.protobuf.getExternalClassUuid(),
        user,
        log
      );
    });
}

function validOps(
  ops: Map<string, IncomingData>,
  invalidTeacherExternalUserIds: Set<string>,
  invalidStudentExternalUserIds: Set<string>
) {
  return Array.from(ops.values())
    .filter((op) => {
      if (
        op.protobuf.getExternalStudentUuidList().length === 0 &&
        op.protobuf.getExternalTeacherUuidList().length === 0
      )
        return false;
      return true;
    })
    .map((op) => {
      if (invalidTeacherExternalUserIds.size > 0) {
        const valid =
          op.data.externalTeacherUuidList?.filter(
            (id) => !invalidTeacherExternalUserIds.has(id)
          ) ?? [];
        op.data.externalTeacherUuidList = valid;
        op.data.teacherUuids = op.data.teacherUuids?.filter(
          (id) => !invalidTeacherExternalUserIds.has(id.external)
        );
        op.protobuf.setExternalTeacherUuidList(valid);
      }

      if (invalidStudentExternalUserIds.size > 0) {
        const valid =
          op.data.externalStudentUuidList?.filter(
            (id) => !invalidStudentExternalUserIds.has(id)
          ) ?? [];
        op.data.externalStudentUuidList = valid;
        op.data.studentUuids = op.data.studentUuids?.filter(
          (id) => !invalidStudentExternalUserIds.has(id.external)
        );
        op.protobuf.setExternalStudentUuidList(valid);
      }

      return op;
    });
}

export function addChunkToRequests<T>(
  classId: Uuid,
  data: { kidsloop: string; external: string }[],
  requestBucket: Map<Uuid, T>[],
  indexChecker: Map<Uuid, number>,
  key: 'studentIds' | 'teacherIds'
) {
  if (data.length === 0) return;

  let dataToAdd = [...data];
  while (dataToAdd.length > 0) {
    const requestData = dataToAdd.slice(0, MAX_PER_ARRAY_CAP);

    const idx = indexChecker.get(classId) || 0;
    while (requestBucket.length < idx + 1) requestBucket.push(new Map());
    if (requestBucket[idx].size >= MAX_PER_ARRAY_CAP) {
      indexChecker.set(classId, idx + 1);
      addChunkToRequests(classId, dataToAdd, requestBucket, indexChecker, key);
      return;
    }

    const payload = {
      classId,
      [key]: requestData.map(({ kidsloop }) => kidsloop),
    } as unknown as T;

    requestBucket[idx].set(classId, payload);

    dataToAdd = dataToAdd.slice(MAX_PER_ARRAY_CAP);
    indexChecker.set(classId, idx + 1);
  }
}

export function dupeErrors<T>(
  error: AdminDupeError,
  addUsersToClasses: { classId: string; userIds: string[] }[],
  transformer: (addUsersToClasses: { classId: string; userIds: string[] }) => T
): { valid: T[]; invalidIds: Set<Uuid> } {
  const errorNames: Map<Uuid, Set<string>> = error.getDupes();

  const retries: T[] = [];
  let invalid: Set<Uuid> = new Set();
  addUsersToClasses.forEach((addTeachersToClass) => {
    const entityNames = errorNames.get(addTeachersToClass.classId) ?? new Set();

    const invalidIds = new Set(
      addTeachersToClass.userIds.filter((teacherId) => {
        return entityNames.has(teacherId);
      })
    );

    const validIds = addTeachersToClass.userIds.filter((teacherId) => {
      return !invalidIds.has(teacherId);
    });

    if (validIds.length > 0) {
      retries.push(
        transformer({
          classId: addTeachersToClass.classId,
          userIds: validIds,
        })
      );
    }

    if (invalidIds.size > 0) {
      invalid = new Set([...invalid, ...invalidIds]);
    }
  });
  return {
    valid: retries,
    invalidIds: invalid,
  };
}

export function teacherDupeErrors(
  error: AdminDupeError,
  addTeachersToClasses: AddTeachersToClassInput[]
): { valid: AddTeachersToClassInput[]; invalidIds: Set<Uuid> } {
  const addUsersToClasses = addTeachersToClasses.map((addTeachersToClass) => {
    return {
      classId: addTeachersToClass.classId,
      userIds: addTeachersToClass.teacherIds,
    };
  });

  return dupeErrors<AddTeachersToClassInput>(
    error,
    addUsersToClasses,
    (req) => {
      return {
        classId: req.classId,
        teacherIds: req.userIds,
      };
    }
  );
}

function studentDupeErrors(
  error: AdminDupeError,
  addStudentsToClasses: AddStudentsToClassInput[]
): { valid: AddStudentsToClassInput[]; invalidIds: Set<Uuid> } {
  const addUsersToClasses = addStudentsToClasses.map((addStudentsToClass) => {
    return {
      classId: addStudentsToClass.classId,
      userIds: addStudentsToClass.studentIds,
    };
  });

  return dupeErrors<AddStudentsToClassInput>(
    error,
    addUsersToClasses,
    (req) => {
      return {
        classId: req.classId,
        studentIds: req.userIds,
      };
    }
  );
}

function studentsToClassesInternalErrors(
  addStudentsToClasses: AddStudentsToClassInput[],
  internalToExternal: Map<Uuid, { requestId: string; external: ExternalUuid }>,
  ops: Map<string, IncomingData>
): Response[] {
  const invalid: Response[] = [];
  for (const request of addStudentsToClasses) {
    const errors = toInternalServerError(
      request.studentIds,
      internalToExternal,
      ops
    );
    invalid.concat(errors);
  }
  return invalid;
}

function teachersToClassesInternalErrors(
  addTeachersToClasses: AddTeachersToClassInput[],
  internalToExternal: Map<Uuid, { requestId: string; external: ExternalUuid }>,
  ops: Map<string, IncomingData>
): Response[] {
  const invalid: Response[] = [];
  for (const request of addTeachersToClasses) {
    const errors = toInternalServerError(
      request.teacherIds,
      internalToExternal,
      ops
    );
    invalid.concat(errors);
  }
  return invalid;
}

function toInternalServerError(
  ids: Uuid[],
  internalToExternal: Map<Uuid, { requestId: string; external: ExternalUuid }>,
  ops: Map<string, IncomingData>
): Response[] {
  const invalid = [];
  for (const id of ids) {
    const metadata = internalToExternal.get(id);
    if (!metadata) continue;
    const op = ops.get(metadata.requestId);
    if (!op) continue;
    invalid.push(internalServerError(op.requestId, metadata.external));
  }
  return invalid;
}

function internalServerError(requestId: RequestId, externalUuid: ExternalUuid) {
  return userError(requestId, externalUuid, INTERNAL_SERVER_ERROR_PROTOBUF);
}

function entityAlreadyExistsError(
  requestId: RequestId,
  externalUuid: ExternalUuid,
  externalClassUuid: ExternalUuid,
  user: 'teacher' | 'student',
  log: Logger
) {
  return userError(
    requestId,
    externalUuid,
    new OnboardingError(
      MachineError.ENTITY_ALREADY_EXISTS,
      `${user} with external uuid ${externalUuid} has already added to class ${externalClassUuid}`,
      Category.REQUEST,
      log
    ).toProtobufError()
  );
}

function userError(
  requestId: RequestId,
  externalUuid: ExternalUuid,
  error: Error
) {
  return new Response()
    .setSuccess(false)
    .setRequestId(requestIdToProtobuf(requestId))
    .setEntity(Entity.USER)
    .setEntityId(externalUuid)
    .setErrors(error);
}
