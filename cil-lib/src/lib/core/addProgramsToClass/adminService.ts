/* For more info about bucketing/handling dupes and requestIds, please visit:
https://calmisland.atlassian.net/wiki/spaces/CSI/pages/2619572328/Bucketing+Dupe+Errors+-+Handling+the+correct+request+Ids
*/

import { Logger } from 'pino';

import {
  Category,
  INTERNAL_SERVER_ERROR_PROTOBUF,
  MachineError,
  OnboardingError,
} from '../../errors';
import { Entity, Response } from '../../protos';
import { AdminService } from '../../services';
import { AdminDupeError } from '../../services/adminService';
import { AddProgramsToClass } from '../../services/adminService/programs';
import { Uuid } from '../../utils';
import { RequestId, requestIdToProtobuf } from '../batchRequest';
import { Result } from '../process';

import { IncomingData } from '.';

const getRequestKey = ({ id, n }: RequestId): string => `${id}||${n}`;
const MAX_PER_ARRAY_CAP = 50;

export async function sendRequest(
  incomingData: IncomingData[],
  log: Logger
): Promise<[Result<IncomingData>, Logger]> {
  const classProgramsRequests = new Map<
    Uuid,
    Map<Uuid, { request: Set<RequestId>; name: string }>
  >();
  const invalidProgramMappings: Map<
    Uuid,
    Map<Uuid, Set<RequestId>>
  > = new Map();
  const requestBucket: Map<string, AddProgramsToClass>[] = [new Map()];
  const indexChecker = new Map();
  const ops = new Map<string, IncomingData>();
  const dataReqId = new Map<string, AddProgramsToClass>();

  let invalidResponses: Response[] = [];

  const admin = await AdminService.getInstance();

  for (const op of incomingData) {
    const kidsloopClassId = op.data.kidsloopClassUuid!;
    const data = op.data.programIds!;

    const key = getRequestKey(op.requestId);
    addChunkToRequests(
      kidsloopClassId,
      data,
      requestBucket,
      indexChecker,
      key,
      dataReqId
    );

    ops.set(key, op);

    for (const program of op.data.programIds || []) {
      if (!classProgramsRequests.has(kidsloopClassId))
        classProgramsRequests.set(kidsloopClassId, new Map());
      const programRequest = classProgramsRequests.get(kidsloopClassId)!;

      if (!programRequest.has(program.id)) {
        programRequest.set(program.id, {
          request: new Set<RequestId>(),
          name: program.name,
        });
      }

      const details = programRequest.get(program.id)!;
      const newRequestIds = details.request.add(op.requestId);
      programRequest.set(program.id, {
        request: newRequestIds,
        name: program.name,
      });
    }
  }

  let index = 0;

  for (const requestBatch of requestBucket) {
    const request = Array.from(requestBatch.values());
    if (request.length === 0) continue;
    try {
      await admin.addProgramsToClass(request, log);
    } catch (error) {
      if (error instanceof AdminDupeError) {
        const retries = dupeErrors(
          error,
          request,
          classProgramsRequests,
          ops,
          dataReqId,
          index,
          invalidProgramMappings,
          log
        );
        invalidResponses = invalidResponses.concat(retries.invalid);

        if (retries.valid.length > 0) {
          try {
            await admin.addProgramsToClass(retries.valid, log);
          } catch (e) {
            if (e instanceof AdminDupeError) {
              log.error(
                `Failed when attempting to retry de-duped add programs to a class in the admin service`
              );
              const r = dupeErrors(
                e,
                request,
                classProgramsRequests,
                ops,
                dataReqId,
                index,
                invalidProgramMappings,
                log
              );
              invalidResponses = invalidResponses.concat(r.invalid);
            } else {
              const invalidInternalServerResponses = internalServerErrors(
                request,
                classProgramsRequests,
                ops,
                invalidResponses
              );
              invalidResponses = invalidResponses.concat(
                invalidInternalServerResponses
              );
            }
          }
        }
      } else {
        const invalidInternalServerResponses = internalServerErrors(
          request,
          classProgramsRequests,
          ops,
          invalidResponses
        );
        invalidResponses = invalidResponses.concat(
          invalidInternalServerResponses
        );
      }
    }
    index = index + 1;
  }

  // Once we map all the invalid programs and requestIds, we are now ready to update the incomingData, filtering out the invalid programs
  updateIncomingData(invalidProgramMappings, ops);

  const data = incomingData.filter(
    (op) => op.protobuf.getProgramNamesList().length > 0
  );

  return [{ valid: data, invalid: invalidResponses }, log];
}

function updateIncomingData(
  invalidProgramMappings: Map<Uuid, Map<Uuid, Set<RequestId>>>,
  ops: Map<string, IncomingData>
) {
  for (const programRequestIds of invalidProgramMappings.values()) {
    for (const [programId, requestIds] of programRequestIds) {
      for (const reqId of requestIds) {
        const requestKey = getRequestKey(reqId);
        const incoming = ops.get(requestKey);
        const newProgramIds = incoming!.data.programIds!.filter(
          (id) => id.id !== programId
        );
        incoming!.data.programIds = newProgramIds;
        const programNames = newProgramIds.map((id) => id.name);
        incoming!.data.programNamesList = programNames;
        incoming!.protobuf.setProgramNamesList(programNames);
        ops.set(requestKey, incoming!);
      }
    }
  }
}

function dupeErrors(
  error: AdminDupeError,
  addProgramsToClasses: AddProgramsToClass[],
  classProgramsRequests: Map<
    Uuid,
    Map<Uuid, { request: Set<RequestId>; name: string }>
  >,
  ops: Map<string, IncomingData>,
  dataToReq: Map<string, AddProgramsToClass>,
  index: number,
  invalidProgramMappings: Map<Uuid, Map<Uuid, Set<RequestId>>>,
  log: Logger
): { valid: AddProgramsToClass[]; invalid: Response[] } {
  const errorNames: Map<Uuid, Set<string>> = error.getDupes();
  const retries: AddProgramsToClass[] = [];
  let invalidResponses: Response[] = [];

  addProgramsToClasses.forEach((addProgramsToClass) => {
    const classId = addProgramsToClass.classId;
    const entityNames = errorNames.get(classId) ?? new Set();
    if (!entityNames) return;

    const invalidProgramIds = new Set<string>();
    for (const id of addProgramsToClass.programIds) {
      if (entityNames.has(id)) invalidProgramIds.add(id);
    }

    // Prepare responses for the programs that already exist and prepare the invalidProgramMappings
    // invalidProgramMappings is a map which contains all the invalid Programs associated with the RequestIds and classId
    const responses = entityAlreadyExistsResponses(
      invalidProgramIds,
      classId,
      classProgramsRequests,
      ops,
      dataToReq,
      index,
      invalidProgramMappings,
      log
    );

    invalidResponses = invalidResponses.concat(responses);

    // Update the payload in order to retry to send the request to Admin Service with the new ProgramIds
    const validIds = addProgramsToClass.programIds.filter((programId) => {
      return !invalidProgramIds.has(programId);
    });

    if (validIds.length > 0) {
      retries.push({
        classId: classId,
        programIds: validIds,
      });
    }
  });

  return {
    valid: retries,
    invalid: invalidResponses,
  };
}

function entityAlreadyExistsResponses(
  invalidProgramIds: Set<string>,
  classId: string,
  classProgramsRequests: Map<
    Uuid,
    Map<Uuid, { request: Set<RequestId>; name: string }>
  >,
  ops: Map<string, IncomingData>,
  dataToReq: Map<string, AddProgramsToClass>,
  index: number,
  invalidProgramMappings: Map<Uuid, Map<Uuid, Set<RequestId>>>,
  log: Logger
): Response[] {
  let invalidResponses: Response[] = [];

  const program = classProgramsRequests.get(classId);

  for (const invalidProgramId of invalidProgramIds) {
    const reqProgramDetails = program!.get(invalidProgramId);
    const requestIds = reqProgramDetails!.request;

    // For each reqId of invalid program, add the index and the class id to create the key that we want to look through dataToReq
    for (const reqId of requestIds) {
      const requestKey = getRequestKey(reqId);
      const invalidProgramKey = `${index}||${classId}||${requestKey}`;

      // Iterate through the dataToReq and find the key which corresponds to invalidProgramKey
      // TODO: Do we want to prepare responses here or just when everything is stored in the invalid programs, like Incoming data??
      for (const key of dataToReq.keys()) {
        if (key === invalidProgramKey) {
          const incoming = ops.get(requestKey);
          const resp = new Response()
            .setSuccess(false)
            .setRequestId(requestIdToProtobuf(reqId))
            .setEntity(Entity.CLASS)
            .setEntityId(incoming!.data.externalClassUuid!)
            .setErrors(
              new OnboardingError(
                MachineError.ENTITY_ALREADY_EXISTS,
                `program with name ${
                  reqProgramDetails!.name
                } already added to class ${incoming!.data.externalClassUuid}`,
                Category.REQUEST,
                log
              ).toProtobufError()
            );

          // Update invalidProgramMappings with the new entries - <classId , <invalidProgramId, Set of Requests>>
          const programs = invalidProgramMappings.get(classId) ?? new Map();
          const requestIds = programs.get(invalidProgramId) ?? new Set();
          requestIds.add(reqId);
          programs.set(invalidProgramId, requestIds);
          invalidProgramMappings.set(classId, programs);

          invalidResponses = invalidResponses.concat(resp);
        }
      }
    }
  }
  return invalidResponses;
}

export function addChunkToRequests(
  classId: Uuid,
  data: { id: string; name: string }[],
  requestBucket: Map<Uuid, AddProgramsToClass>[],
  indexChecker: Map<Uuid, number>,
  reqId: string,
  dataToReq: Map<string, AddProgramsToClass>
) {
  if (data.length === 0) return;

  let dataToAdd = [...data];
  while (dataToAdd.length > 0) {
    const requestData = dataToAdd.slice(0, MAX_PER_ARRAY_CAP);

    const idx = indexChecker.get(classId) || 0;
    while (requestBucket.length < idx + 1) requestBucket.push(new Map());
    if (requestBucket[idx].size >= MAX_PER_ARRAY_CAP) {
      indexChecker.set(classId, idx + 1);
      addChunkToRequests(
        classId,
        dataToAdd,
        requestBucket,
        indexChecker,
        reqId,
        dataToReq
      );
      return;
    }

    const payload = {
      classId,
      programIds: requestData.map(({ id }) => id),
    };

    const key = `${idx}||${classId}||${reqId}`;
    dataToReq.set(key, payload);
    requestBucket[idx].set(classId, payload);

    dataToAdd = dataToAdd.slice(MAX_PER_ARRAY_CAP);
    indexChecker.set(classId, idx + 1);
  }
}

function internalServerErrors(
  request: AddProgramsToClass[],
  classProgramsRequests: Map<
    Uuid,
    Map<Uuid, { request: Set<RequestId>; name: string }>
  >,
  ops: Map<string, IncomingData>,
  invalidResponses: Response[]
): Response[] {
  for (const r of request) {
    const classId = r.classId;
    const details = classProgramsRequests.get(classId);
    for (const programId of r.programIds) {
      const reqDetails = details!.get(programId);
      const requestIds = reqDetails!.request;
      for (const reqId of requestIds) {
        const key = getRequestKey(reqId);
        const incoming = ops.get(key);
        const resp = new Response()
          .setSuccess(false)
          .setRequestId(requestIdToProtobuf(reqId))
          .setEntity(Entity.CLASS)
          .setEntityId(incoming!.data.externalClassUuid!)
          .setErrors(INTERNAL_SERVER_ERROR_PROTOBUF);

        invalidResponses = invalidResponses.concat(resp);
      }
    }
  }
  return invalidResponses;
}
