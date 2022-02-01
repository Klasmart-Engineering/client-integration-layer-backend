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
import { Result } from '../../process';

import { IncomingData } from '.';

export async function sendRequest(
  classes: IncomingData[],
  log: Logger
): Promise<[Result<IncomingData>, Logger]> {
  const invalid: Response[] = [];

  try {
    const admin = await AdminService.getInstance();
    const result = await admin.createClasses(
      classes.map(({ data }) => ({
        organizationId: data.kidsloopOrganizationUuid!,
        name: data.name!,
        shortCode: data.shortCode,
      })),
      log
    );

    const m = new Map<string, IncomingData>();
    for (const clazz of classes) {
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
    // @TODO - We need to filter out any invalid entities or entities that
    // already exist and retry
    for (const c of classes) {
      const r = new Response()
        .setEntity(Entity.CLASS)
        .setRequestId(c.requestId)
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
