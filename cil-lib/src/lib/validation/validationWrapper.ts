import { Logger } from 'pino';

import { Props } from '../errors';
import { Action, Entity, OnboardingRequest } from '../protos/api_pb';
import { actionToString } from '../types/action';
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
    const action = data.getAction();
    const requestId = data.getRequestId();
    const tracker = RequestIdTracker.getInstance();
    tracker.addId(requestId, logger);
    const props: Props = {
      action: actionToString(action),
    };
    logger.info(`Attempting to validate ${props.action} ${data.getPayloadCase()}`, {
      requestId
    });

    let entity: Entity;
    let entityId: ExternalUuid;
    switch (action) {
      case Action.CREATE: {
        [entity, entityId, logger] = await parseCreateEntity(
          data,
          logger,
          props
        );
        break;
      }
      case Action.LINK: {
        [entity, entityId, logger] = await parseLinkEntities(
          data,
          logger,
          props
        );
        break;
      }
    }
    const childLogger = logger.child(props);
    return new ValidationWrapper(data, entity, entityId, childLogger);
  }
}
