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
import { requestIdToProtobuf } from '../batchRequest';
import { Result } from '../process';

import { IncomingData } from '.';

export async function sendRequest(
  addProgramsToClasses: IncomingData[],
  log: Logger
): Promise<[Result<IncomingData>, Logger]> {
  const invalid: Response[] = [];

  try {
    const admin = await AdminService.getInstance();
    const results = await admin.addProgramsToClass(
      addProgramsToClasses.map(({ data }) => ({
        classId: data.kidsloopClassUuid!,
        programIds: data.programIds!.map((program) => program.id)!,
      })),
      log
    );

    const addPrograms = new Map<string, IncomingData>();
    for (const addProgramsToClass of addProgramsToClasses) {
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
    for (const addPrograms of addProgramsToClasses) {
      const response = new Response()
        .setEntity(Entity.CLASS)
        .setRequestId(requestIdToProtobuf(addPrograms.requestId))
        .setSuccess(false);
      if (error instanceof Errors || error instanceof OnboardingError) {
        response.setErrors(error.toProtobufError());
      } else {
        response.setErrors(INTERNAL_SERVER_ERROR_PROTOBUF);
      }
      invalid.push(response);
    }
  }
  return [{ valid: [], invalid }, log];
}
