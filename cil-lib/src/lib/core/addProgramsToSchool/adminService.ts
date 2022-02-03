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
  addProgramsToSchools: IncomingData[],
  log: Logger
): Promise<[Result<IncomingData>, Logger]> {
  const invalid: Response[] = [];

  try {
    const admin = await AdminService.getInstance();
    const results = await admin.addProgramsToSchool(
      addProgramsToSchools.map(({ data }) => ({
        schoolId: data.kidsloopSchoolUuid!,
        programIds: data.programIds!.map((program) => program.id)!,
      })),
      log
    );

    const addPrograms = new Map<string, IncomingData>();
    for (const addProgramsToSchool of addProgramsToSchools) {
      addPrograms.set(
        addProgramsToSchool.data.kidsloopSchoolUuid || 'UNKNOWN',
        addProgramsToSchool
      );
    }

    for (const result of results) {
      const school = addPrograms.get(result.id);
      if (!school) {
        throw new OnboardingError(
          MachineError.WRITE,
          `Didn't link the programs to the school: ${result.name}`,
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
    for (const addPrograms of addProgramsToSchools) {
      const response = new Response()
        .setEntity(Entity.SCHOOL)
        .setRequestId(requestIdToProtobuf(addPrograms.requestId))
        .setEntityId(addPrograms.protobuf.getExternalSchoolUuid())
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
