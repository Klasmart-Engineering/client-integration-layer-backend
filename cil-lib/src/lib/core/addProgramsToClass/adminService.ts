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
import { Uuid } from '../../utils';
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
    const results = await admin.addProgramsToClass(
      incomingData.map(({ data }) => ({
        classId: data.kidsloopClassUuid!,
        programIds: data.programIds!.map((program) => program.id)!,
      })),
      log
    );

    const addPrograms = new Map<string, IncomingData>();
    for (const addProgramsToClass of incomingData) {
      addPrograms.set(
        addProgramsToClass.data.kidsloopClassUuid || 'UNKNOWN',
        addProgramsToClass
      );
    }

    for (const result of results) {
      const clazz = addPrograms.get(result.id);
      if (!clazz) {
        throw new OnboardingError(
          MachineError.WRITE,
          `Didn't link the programs to the class: ${result.name}`,
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
    return [{ valid: Array.from(addPrograms.values()), invalid: [] }, log];
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
      for (const addPrograms of incomingData) {
        const response = new Response()
          .setEntity(Entity.CLASS)
          .setRequestId(requestIdToProtobuf(addPrograms.requestId))
          .setEntityId(addPrograms.protobuf.getExternalClassUuid())
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
      errorNames.get(incoming.data.kidsloopClassUuid!) ?? new Set();

    const retryIds: { id: Uuid; name: string }[] = [];
    const invalidNames: string[] = [];
    incoming.data.programIds!.forEach((id) => {
      if (!entityNames.has(id.id)) {
        retryIds.push(id);
      } else {
        invalidNames.push(id.name);
      }
    });

    invalid = invalid.concat(
      invalidNames.map((name) => {
        return new Response()
          .setEntity(Entity.CLASS)
          .setEntityId(incoming.protobuf.getExternalClassUuid())
          .setRequestId(requestIdToProtobuf(incoming.requestId))
          .setErrors(
            new OnboardingError(
              MachineError.ENTITY_ALREADY_EXISTS,
              `program with name ${name!} already added to class ${incoming.data
                .externalClassUuid!}`,
              Category.REQUEST,
              log
            ).toProtobufError()
          )
          .setSuccess(false);
      })
    );

    if (retryIds.length > 0) {
      incoming.data.programIds = retryIds;
      const programNames = retryIds.map((id) => id.name);
      incoming.data.programNamesList = programNames;
      incoming.protobuf.setProgramNamesList(programNames);
      retries.push(incoming);
    }
  });
  return { valid: retries, invalid: invalid };
}
