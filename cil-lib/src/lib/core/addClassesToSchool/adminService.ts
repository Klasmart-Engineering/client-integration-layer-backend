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
  addClassesToSchools: IncomingData[],
  log: Logger
): Promise<[Result<IncomingData>, Logger]> {
  const invalid: Response[] = [];

  try {
    const admin = await AdminService.getInstance();
    const results = await admin.addClassesToSchool(
      addClassesToSchools.map(({ data }) => ({
        schoolId: data.kidsloopSchoolUuid!,
        classIds: data.kidsloopClassIds!.map((clazz) => clazz.kidsloop)!,
      })),
      log
    );

    const addClasses = new Map<string, IncomingData>();
    for (const addClassesToSchool of addClassesToSchools) {
      addClasses.set(
        addClassesToSchool.data.kidsloopSchoolUuid || 'UNKNOWN',
        addClassesToSchool
      );
    }

    for (const result of results) {
      const school = addClasses.get(result.id);
      if (!school) {
        throw new OnboardingError(
          MachineError.NETWORK,
          `Didn't link the class to the school: ${result.name}`,
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
    return [{ valid: Array.from(addClasses.values()), invalid: [] }, log];
  } catch (error) {
    for (const addClassToSchool of addClassesToSchools) {
      for (const c of addClassToSchool.data.kidsloopClassIds || []) {
        const response = new Response()
          .setEntity(Entity.CLASS)
          .setRequestId(requestIdToProtobuf(addClassToSchool.requestId))
          .setEntityId(c.external)
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
