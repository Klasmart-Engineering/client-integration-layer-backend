import { OnboardingRequest, Response } from '../protos/api_pb';
import { RedisStream } from '../redis';
import { Message } from '../types';
import { actionToString } from '../types/action';
import { ValidationWrapper } from '../validation';

// @TODO - Need to actually implement error handling around this
// Currently we either throw an error or succeed (don't send error messages back)
export const processMessage = async (
  data: OnboardingRequest
): Promise<Response> => {
  const wrapper = await ValidationWrapper.parseRequest(data);
  const logger = wrapper.logger.child({ currentOperation: 'PUBLISH' });
  logger.info(
    `Received request to perform action: ${actionToString(
      wrapper.data.getAction()
    )} ${wrapper.data.getPayloadCase().toString()}`
  );
  const msg = Message.fromOnboardingRequest(data);
  const stream = await RedisStream.getInstance(logger);
  await stream.publishMessage(msg, logger);
  const resp = new Response();
  resp.setRequestId(data.getRequestId());
  resp.setEntity(wrapper.entity);
  resp.setEntityId(wrapper.entityId);
  resp.setSuccess(true);
  return resp;
};
