import { Category, MachineError, OnboardingError } from '../..';
import { Organization } from '../entities';
import { OnboardingRequest, RequestInformation } from '../protos/api_pb';
import { RedisStream } from '../redis';
import { Entity, Message } from '../types';
import { ValidationWrapper } from '../validation';

import { log } from './log';

export const processMessage = async (
  data: OnboardingRequest
): Promise<RequestInformation> => {
  if (data.getEntityCase() === OnboardingRequest.EntityCase.ORGANIZATION) {
    const org = data.getOrganization();
    if (!org)
      throw new OnboardingError(
        MachineError.VALIDATION,
        `Unable to initialize an organization if one isn't provided`,
        Entity.ORGANIZATION,
        Category.REQUEST
      );
    await Organization.initializeOrganization(org);
  }

  const wrapper = new ValidationWrapper(data);
  log.info(
    {
      entity: wrapper.mapEntity,
      entityId: wrapper.getEntityId(),
    },
    `Received request to add new ${wrapper.mapEntity}`
  );
  await wrapper.validate();
  const msg = Message.fromOnboardingRequest(data);
  const stream = await RedisStream.getInstance();
  await stream.publishMessage(msg);
  const resp = new RequestInformation();
  resp.setRequestId(data.getRequestId());
  return resp;
};
