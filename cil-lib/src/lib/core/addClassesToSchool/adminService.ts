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
    const results = await admin.addClassesToSchool(
      incomingData.map(({ data }) => ({
        schoolId: data.kidsloopSchoolUuid!,
        classIds: data.kidsloopClassIds!.map((clazz) => clazz.kidsloop)!,
      })),
      log
    );

    const addClasses = new Map<string, IncomingData>();
    for (const addClassesToSchool of incomingData) {
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
      for (const addClassToSchool of incomingData) {
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
  }
  return [{ valid: [], invalid }, log];
}

function dupeErrors(
  error: AdminDupeError,
  incomingData: IncomingData[],
  log: Logger
): Result<IncomingData> {
  const errorNames: Map<Uuid, Set<string>> = error.getDupes();

  const retries: IncomingData[] = [];
  let invalid: Response[] = [];
  incomingData.forEach((incoming) => {
    const entityNames =
      errorNames.get(incoming.data.kidsloopSchoolUuid!) ?? new Set();

    const retryIds: { external: string; kidsloop: string }[] = [];
    const invalidExternalIds: string[] = [];
    incoming.data.kidsloopClassIds!.forEach((id) => {
      if (!entityNames.has(id.kidsloop)) {
        retryIds.push(id);
      } else {
        invalidExternalIds.push(id.external);
      }
    });

    invalid = invalid.concat(
      invalidExternalIds.map((id) => {
        return new Response()
          .setEntity(Entity.CLASS)
          .setEntityId(id)
          .setRequestId(requestIdToProtobuf(incoming.requestId))
          .setErrors(
            new OnboardingError(
              MachineError.ENTITY_ALREADY_EXISTS,
              `class with external uuid ${id} has already added to school ${incoming.protobuf.getExternalSchoolUuid()}`,
              Category.REQUEST,
              log
            ).toProtobufError()
          )
          .setSuccess(false);
      })
    );

    if (retryIds.length > 0) {
      incoming.data.kidsloopClassIds = retryIds;
      const externalClassId = retryIds.map((id) => id.external);
      incoming.data.externalClassUuidsList = externalClassId;
      incoming.protobuf.setExternalClassUuidsList(externalClassId);
      retries.push(incoming);
    }
  });
  return { valid: retries, invalid: invalid };
}
