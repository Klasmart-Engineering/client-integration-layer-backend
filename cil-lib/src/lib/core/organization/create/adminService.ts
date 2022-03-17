import { Logger } from 'pino';

import { Organization } from '../../../database';
import {
  Errors,
  INTERNAL_SERVER_ERROR_PROTOBUF,
  OnboardingError,
} from '../../../errors';
import { Entity, Response } from '../../../protos';
import { requestIdToProtobuf } from '../../batchRequest';
import { Result } from '../../process';

import { IncomingData } from '.';

export async function sendRequest(
  orgs: IncomingData[],
  log: Logger
): Promise<[Result<IncomingData>, Logger]> {
  const valid = [];
  const invalid: Response[] = [];

  for (const org of orgs) {
    try {
      await Organization.initializeOrganization(org.protobuf.toObject(), log);
      valid.push(org);
    } catch (error) {
      const r = new Response()
        .setEntity(Entity.ORGANIZATION)
        .setEntityId(org.protobuf.getExternalUuid())
        .setRequestId(requestIdToProtobuf(org.requestId))
        .setSuccess(false);
      if (error instanceof Errors || error instanceof OnboardingError) {
        r.setErrors(error.toProtobufError());
      } else {
        r.setErrors(INTERNAL_SERVER_ERROR_PROTOBUF);
      }
      invalid.push(r);
    }
  }

  return [{ valid, invalid }, log];
}
