import { Logger } from 'pino';

import { Context } from '../../../..';
import {
  Errors,
  INTERNAL_SERVER_ERROR_PROTOBUF,
  OnboardingError,
  tryGetMember,
} from '../../../errors';
import { Entity, Response } from '../../../protos';
import { requestIdToProtobuf } from '../../batchRequest';
import { Result } from '../../process';

import { IncomingData } from '.';

export async function prepare(
  classes: IncomingData[],
  log: Logger
): Promise<[Result<IncomingData>, Logger]> {
  const ctx = await Context.getInstance();
  const valid = [];
  const invalid: Response[] = [];
  for (const clazz of classes) {
    try {
      const orgId = await ctx.getOrganizationId(
        tryGetMember(clazz.data.externalOrganizationUuid, log),
        log
      );
      clazz.data.kidsloopOrganizationUuid = orgId;
      valid.push(clazz);
    } catch (error) {
      const r = new Response()
        .setEntity(Entity.CLASS)
        .setRequestId(requestIdToProtobuf(clazz.requestId))
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
