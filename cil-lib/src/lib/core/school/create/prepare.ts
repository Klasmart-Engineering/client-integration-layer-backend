import { Logger } from 'pino';

import { Context } from '../../../..';
import {
  Errors,
  INTERNAL_SERVER_ERROR_PROTOBUF,
  OnboardingError,
  tryGetMember,
} from '../../../errors';
import { Entity, Response } from '../../../protos';
import { Result } from '../../process';

import { IncomingData } from '.';

export async function prepare(
  schools: IncomingData[],
  log: Logger
): Promise<[Result<IncomingData>, Logger]> {
  const ctx = Context.getInstance();
  const valid = [];
  const invalid: Response[] = [];
  for (const school of schools) {
    try {
      const orgId = await ctx.getOrganizationId(
        tryGetMember(school.data.externalOrganizationUuid, log),
        log
      );
      school.data.kidsloopOrganizationUuid = orgId;
      valid.push(school);
    } catch (error) {
      const r = new Response()
        .setEntity(Entity.SCHOOL)
        .setRequestId(school.requestId)
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
