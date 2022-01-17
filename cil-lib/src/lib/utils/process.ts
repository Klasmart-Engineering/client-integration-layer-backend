import { Logger } from 'pino';

import { OnboardingError } from '../errors';
import {
  OnboardingRequest,
  // Error as PbError,
  Response,
  // ValidationError,
} from '../protos/api_pb';
import { RedisStream } from '../redis';
import { Message } from '../types';
import { actionToString } from '../types/action';
import { ValidationWrapper } from '../validation';

// @TODO - Need to actually implement error handling around this
// Currently we either throw an error or succeed (don't send error messages back)
export const processMessage = async (
  data: OnboardingRequest,
  log: Logger
): Promise<Response> => {
  const resp = new Response();
  resp.setRequestId(data.getRequestId());
  resp.setSuccess(false);

  const logger: Logger = log;
  try {
    const wrapper = await ValidationWrapper.parseRequest(data, log);
    const logger = wrapper.logger.child({ currentOperation: 'PUBLISH' });
    logger.info(
      `Received request to perform action: ${actionToString(
        wrapper.data.getAction()
      )} ${wrapper.data.getPayloadCase().toString()}`
    );
    resp.setEntity(wrapper.entity);
    resp.setEntityId(wrapper.entityId);
  } catch (error) {
    // Need to set entity & entity ID on failure too
    resp.setSuccess(false);
    if (error instanceof OnboardingError) {
      // const e = new PbError();
      // const v = new ValidationError();
      // @TODO
    }
    return resp;
  }
  try {
    const msg = Message.fromOnboardingRequest(data);
    const stream = await RedisStream.getInstance(logger);
    await stream.publishMessage(msg, logger);
    resp.setSuccess(true);
  } catch (error) {}
  return resp;
};
