import { Logger } from 'pino';

import {
  Category,
  Errors,
  INTERNAL_SERVER_ERROR_PROTOBUF,
  MachineError,
  OnboardingError,
} from '../../../errors';
import { Entity, Response } from '../../../protos';
import { AdminService } from '../../../services';
import { AdminDupeError } from '../../../services/adminService';
import { retryDupes } from '../../../utils/dupe';
import { requestIdToProtobuf } from '../../batchRequest';
import { Result } from '../../process';

import { IncomingData } from '.';

export async function sendRequest(
  incomingData: IncomingData[],
  log: Logger,
  retry = true
): Promise<[Result<IncomingData>, Logger]> {
  let invalid: Response[] = [];

  try {
    const admin = await AdminService.getInstance();
    const result = await admin.createClasses(
      incomingData.map(({ data }) => ({
        organizationId: data.kidsloopOrganizationUuid!,
        name: data.name!,
        shortCode: data.shortCode,
      })),
      log
    );

    const m = new Map<string, IncomingData>();
    for (const clazz of incomingData) {
      m.set(clazz.data.name || 'UNKNOWN', clazz);
    }

    for (const c of result) {
      const clazz = m.get(c.name);
      if (!clazz)
        throw new OnboardingError(
          MachineError.WRITE,
          `Received a class name that we didn't try and add ${c.name}`,
          Category.ADMIN_SERVICE,
          log,
          [],
          {},
          [
            `Please speak to someone in the admin service team, this really shouldn't happen`,
          ]
        );
      clazz.data.kidsloopClassUuid = c.id;
    }
    return [{ valid: Array.from(m.values()), invalid: [] }, log];
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
      for (const c of incomingData) {
        const r = new Response()
          .setEntity(Entity.CLASS)
          .setRequestId(requestIdToProtobuf(c.requestId))
          .setSuccess(false);
        if (error instanceof Errors || error instanceof OnboardingError) {
          r.setErrors(error.toProtobufError());
        } else {
          r.setErrors(INTERNAL_SERVER_ERROR_PROTOBUF);
        }
        invalid.push(r);
      }
    }
    return [{ valid: [], invalid }, log];
  }

  function dupeErrors(
    error: AdminDupeError,
    incomings: IncomingData[],
    log: Logger
  ): Result<IncomingData> {
    const errorNames: Map<string, Set<string>> = error.getDupes();
    const retries: IncomingData[] = [];
    const invalid: Response[] = [];
    incomings.forEach((incoming) => {
      const entityNames =
        errorNames.get(incoming.data.kidsloopOrganizationUuid!) ?? new Set();
      if (!entityNames.has(incoming.data.name!)) {
        retries.push(incoming);
      } else {
        const response = new Response()
          .setEntity(Entity.CLASS)
          .setEntityId(incoming.protobuf.getExternalUuid())
          .setRequestId(requestIdToProtobuf(incoming.requestId))
          .setErrors(
            new OnboardingError(
              MachineError.ENTITY_ALREADY_EXISTS,
              `class with id ${incoming.data.externalUuid!} already exists`,
              Category.REQUEST,
              log
            ).toProtobufError()
          )
          .setSuccess(false);
        invalid.push(response);
      }
    });
    return { valid: retries, invalid: invalid };
  }
}
