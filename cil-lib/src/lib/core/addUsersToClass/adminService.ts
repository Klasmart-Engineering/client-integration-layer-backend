import { Logger } from 'pino';

import { ExternalUuid, Uuid } from '../../..';
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
  const invalid: Response[] = [];
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

  for (const r of studentsRequests) {
    const req = Array.from(r.values());
    if (req.length === 0) continue;
    try {
      await admin.addStudentsToClasses(req, log);
    } catch (e) {
      log.error(
        `Failed when attempting to add a chunked batch of students to a class in the admin service`
      );
      for (const request of req) {
        for (const id of request.studentIds) {
          const metadata = internalToExternal.get(id);
          if (!metadata) continue;
          const op = ops.get(metadata.requestId);
          if (!op) continue;
          const resp = new Response()
            .setSuccess(false)
            .setRequestId(requestIdToProtobuf(op.requestId))
            .setEntity(Entity.USER)
            .setEntityId(metadata.external)
            .setErrors(INTERNAL_SERVER_ERROR_PROTOBUF);
          invalid.push(resp);
          const updatedData = (op.data.externalStudentUuidList || []).filter(
            (existingId) => existingId !== metadata.external
          );
          op.data.externalStudentUuidList = updatedData;
          op.protobuf.setExternalStudentUuidList(updatedData);
        }
      }
    }
  }
  for (const r of teachersRequests) {
    const req = Array.from(r.values());
    if (req.length === 0) continue;
    try {
      await admin.addTeachersToClasses(req, log);
    } catch (e) {
      log.error(
        `Failed when attempting to add a chunked batch of teachers to a class in the admin service`
      );
      for (const request of req) {
        for (const id of request.teacherIds) {
          const metadata = internalToExternal.get(id);
          if (!metadata) continue;
          const op = ops.get(metadata.requestId);
          if (!op) continue;
          const resp = new Response()
            .setSuccess(false)
            .setRequestId(requestIdToProtobuf(op.requestId))
            .setEntity(Entity.USER)
            .setEntityId(metadata.external)
            .setErrors(INTERNAL_SERVER_ERROR_PROTOBUF);
          invalid.push(resp);
          const updatedData = (op.data.externalTeacherUuidList || []).filter(
            (existingId) => existingId !== metadata.external
          );
          op.data.externalTeacherUuidList = updatedData;
          op.protobuf.setExternalTeacherUuidList(updatedData);
        }
      }
    }
  }

  const newOps = Array.from(ops.values()).filter((op) => {
    if (
      op.protobuf.getExternalStudentUuidList().length === 0 &&
      op.protobuf.getExternalTeacherUuidList().length === 0
    )
      return false;
    return true;
  });

  return { valid: newOps, invalid };
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
