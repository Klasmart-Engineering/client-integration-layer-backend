import { Logger } from 'pino';

import { Errors, OnboardingError } from '../errors';
import {
  Entity,
  LinkEntities,
  OnboardingRequest,
  Error as PbError,
  Response,
} from '../protos/api_pb';
import { Producer } from '../redis';
import { Message } from '../types';
import { actionToString } from '../types/action';
import { ValidationWrapper } from '../validation';

import { ExternalUuid } from '.';

// @TODO - Need to actually implement error handling around this
// Currently we either throw an error or succeed (don't send error messages back)
export const processMessage = async (
  data: OnboardingRequest,
  log: Logger
): Promise<Response> => {
  const resp = new Response();
  resp.setRequestId(data.getRequestId());
  const [e, id] = mapPayloadCase(data);
  resp.setEntity(e);
  resp.setEntityId(id);
  resp.setSuccess(false);
  let logger = log;

  try {
    const wrapper = await ValidationWrapper.parseRequest(data, log);
    logger = wrapper.logger.child({ currentOperation: 'PUBLISH' });
    logger.info(
      `Received request to perform action: ${actionToString(
        wrapper.data.getAction()
      )} ${wrapper.data.getPayloadCase().toString()}`
    );
    // @TODO - Can probably remove these once we're confident that they line up
    if (e !== wrapper.entity)
      logger.warn(
        `When parsing request expected the initially identified entity ${e} to match the newly parsed entity ${wrapper.entity}`
      );
    if (id !== wrapper.entityId)
      logger.warn(
        `When parsing request expected the initially identified entity id ${id} to match the newly parsed entity id ${wrapper.entityId}`
      );
    resp.setEntity(wrapper.entity);
    resp.setEntityId(wrapper.entityId);
    const msg = Message.fromOnboardingRequest(data, logger);
    const producer = await Producer.getInstance(logger);
    await producer.publishMessage(msg, logger);
    resp.setSuccess(true);
    return resp;
  } catch (error) {
    if (error instanceof Errors || error instanceof OnboardingError) {
      const err = error.toProtobufError();
      resp.setErrors(err);

      // Write the error to the failure queue
      if (err.getErrorTypeCase() === PbError.ErrorTypeCase.VALIDATION) {
        const producer = await Producer.getInstance(logger);
        await producer.publishFailure(resp, logger);
      }
    } else {
      logger.warn(
        `Found an error that wasn't correctly converted to a response - if you're seeing this the code needs an update`
      );
    }

    return resp;
  }
};

const mapPayloadCase = (r: OnboardingRequest): [Entity, ExternalUuid] => {
  let id = 'UNKNOWN';
  let entity = Entity.ORGANIZATION;
  switch (r.getPayloadCase()) {
    case OnboardingRequest.PayloadCase.ORGANIZATION: {
      entity = Entity.ORGANIZATION;
      const org = r.getOrganization();
      if (org) id = org.getExternalUuid();
      break;
    }
    case OnboardingRequest.PayloadCase.SCHOOL: {
      entity = Entity.SCHOOL;
      const sch = r.getSchool();
      if (sch) id = sch.getExternalUuid();
      break;
    }
    case OnboardingRequest.PayloadCase.CLASS: {
      entity = Entity.CLASS;
      const cla = r.getClass();
      if (cla) id = cla.getExternalUuid();
      break;
    }
    case OnboardingRequest.PayloadCase.USER: {
      entity = Entity.USER;
      const user = r.getUser();
      if (user) id = user.getExternalUuid();
      break;
    }
    case OnboardingRequest.PayloadCase.LINK_ENTITIES: {
      [entity, id] = mapTargetCase(r.getLinkEntities());
      break;
    }
    default:
      break;
  }
  return [entity, id];
};

const mapTargetCase = (r?: LinkEntities): [Entity, ExternalUuid] => {
  let entity = Entity.ORGANIZATION;
  let id = 'UNKNOWN';
  if (!r) return [entity, id];
  switch (r.getTargetCase()) {
    case LinkEntities.TargetCase.ORGANIZATION: {
      entity = Entity.ORGANIZATION;
      const org = r.getOrganization();
      if (org) id = org.getExternalUuid();
      break;
    }
    case LinkEntities.TargetCase.SCHOOL: {
      entity = Entity.SCHOOL;
      const sch = r.getSchool();
      if (sch) id = sch.getExternalUuid();
      break;
    }
    case LinkEntities.TargetCase.CLASS: {
      entity = Entity.CLASS;
      const cla = r.getClass();
      if (cla) id = cla.getExternalUuid();
      break;
    }
    case LinkEntities.TargetCase.USER: {
      entity = Entity.USER;
      const user = r.getUser();
      if (user) id = user.getExternalUuid();
      break;
    }
    default:
      break;
  }
  return [entity, id];
};
