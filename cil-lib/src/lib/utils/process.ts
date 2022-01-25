import { Logger } from 'pino';

import { Errors, OnboardingError } from '../errors';
import { OnboardingRequest, Response } from '../protos/api_pb';
import { Message } from '../types';
import { actionToString } from '../types/action';
import { entityToProtobuf } from '../types/entity';
import { ValidationWrapper } from '../validation';

import { parseOnboardingRequestForMetadata } from './parseRequestForMetadata';

export const processMessage = async (
  data: OnboardingRequest,
  log: Logger
): Promise<Response> => {
  const resp = new Response();
  resp.setRequestId(data.getRequestId());
  const { entity, identifier } = parseOnboardingRequestForMetadata(data, log);
  const pbEntity = entityToProtobuf(entity, log);
  resp.setEntity(pbEntity);
  resp.setEntityId(identifier);
  resp.setSuccess(false);
  let logger = log;

  try {
    const wrapper = await ValidationWrapper.parseRequest(data, logger);
    logger = wrapper.logger.child({ currentOperation: 'PUBLISH' });
    logger.info(
      `Received request to perform action: ${actionToString(
        wrapper.data.getAction()
      )} ${wrapper.data.getPayloadCase().toString()}`
    );
    // @TODO - Can probably remove these once we're confident that they line up
    if (pbEntity !== wrapper.entity)
      logger.warn(
        `When parsing request expected the initially identified entity ${entity} to match the newly parsed entity ${wrapper.entity}`
      );
    if (identifier !== wrapper.entityId)
      logger.warn(
        `When parsing request expected the initially identified entity id ${identifier} to match the newly parsed entity id ${wrapper.entityId}`
      );
    resp.setEntity(wrapper.entity);
    resp.setEntityId(wrapper.entityId);
    Message.fromOnboardingRequest(data, logger);
    // @TODO - Call admin service
    resp.setSuccess(true);
    return resp;
  } catch (error) {
    if (error instanceof Errors || error instanceof OnboardingError) {
      const err = error.toProtobufError();
      resp.setErrors(err);
    } else {
      logger.warn(
        `Found an error that wasn't correctly converted to a response - if you're seeing this the code needs an update`
      );
    }

    return resp;
  }
};
