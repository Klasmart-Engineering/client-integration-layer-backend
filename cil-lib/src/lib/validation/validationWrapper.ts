import { Logger } from 'pino';

import { BAD_REQUEST, BASE_PATH } from '../errors';
import { Entity, OnboardingRequest } from '../protos/api_pb';
import { ExternalUuid } from '../utils';
import { RequestIdTracker } from '../utils/requestId';

import { parseCreateEntity } from './createEntity';
import { parseLinkEntities } from './linkEntities';

export class ValidationWrapper {
  private constructor(
    public readonly data: OnboardingRequest,
    public readonly entity: Entity,
    public readonly entityId: ExternalUuid,
    public logger: Logger
  ) {}

  public static async parseRequest(
    data: OnboardingRequest,
    log: Logger
  ): Promise<ValidationWrapper> {
    let logger = log.child({ currentOperation: 'VALIDATION' });
    const requestId = data.getRequestId();
    const tracker = RequestIdTracker.getInstance();
    tracker.addId(requestId, logger);
    logger.info(`Attempting to validate ${data.getPayloadCase()}`, {
      requestId,
    });

    const props = {};

    let entity: Entity;
    let entityId: ExternalUuid;
    switch (data.getPayloadCase()) {
      case OnboardingRequest.PayloadCase.LINK_ENTITIES: {
        [entity, entityId, logger] = await parseLinkEntities(
          data,
          logger,
          props
        );
        break;
      }

      case OnboardingRequest.PayloadCase.ORGANIZATION:
      case OnboardingRequest.PayloadCase.SCHOOL:
      case OnboardingRequest.PayloadCase.CLASS:
      case OnboardingRequest.PayloadCase.USER: {
        [entity, entityId, logger] = await parseCreateEntity(
          data,
          logger,
          props
        );
        break;
      }
      default: {
        throw BAD_REQUEST(
          'Expected to find a valid payload type within the request',
          [...BASE_PATH, 'payload'],
          log,
          props
        );
      }
    }
    const childLogger = logger.child(props);
    return new ValidationWrapper(data, entity, entityId, childLogger);
  }
}
