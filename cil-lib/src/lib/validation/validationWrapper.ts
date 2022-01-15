import { Logger } from 'pino';

import { log } from '../..';
import { Props } from '../errors';
import { Action, OnboardingRequest } from '../protos/api_pb';
import { actionToString } from '../types/action';
import { RequestIdTracker } from '../utils/requestId';

import { parseCreateEntity } from './createEntity';
import { parseLinkEntities } from './linkEntities';

export class ValidationWrapper {
  private constructor(
    public readonly data: OnboardingRequest,
    public logger: Logger
  ) {}

  public static async parseRequest(
    data: OnboardingRequest
  ): Promise<ValidationWrapper> {
    let logger = log.child({ currentOperation: 'VALIDATION' });
    const action = data.getAction();
    const requestId = data.getRequestId();
    const tracker = RequestIdTracker.getInstance();
    tracker.addId(requestId, logger);
    const props: Props = {
      action: actionToString(action),
    };

    switch (action) {
      case Action.CREATE: {
        logger = await parseCreateEntity(data, logger, props);
        break;
      }
      case Action.LINK: {
        logger = await parseLinkEntities(data, logger, props);
        break;
      }
    }
    const childLogger = logger.child(props);
    return new ValidationWrapper(data, childLogger);
  }
}
