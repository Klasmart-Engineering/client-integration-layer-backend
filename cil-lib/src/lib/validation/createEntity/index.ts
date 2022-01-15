import { Logger } from 'pino';

import { BAD_REQUEST, BASE_PATH, Props, tryGetMember } from '../../errors';
import { OnboardingRequest } from '../../protos/api_pb';

import {
  ValidatedClass,
  ValidatedOrganization,
  ValidatedSchool,
  ValidatedUser,
} from './entities';

export async function parseCreateEntity(
  req: OnboardingRequest,
  log: Logger,
  props: Props
): Promise<Logger> {
  const path = [...BASE_PATH];
  const payload = req.getPayloadCase();
  switch (payload) {
    case OnboardingRequest.PayloadCase.ORGANIZATION: {
      path.push('organization');
      const entity = tryGetMember(req.getOrganization(), log, path);
      const validated = await ValidatedOrganization.fromRequest(
        entity,
        log,
        path,
        props
      );
      return validated.logger;
    }
    case OnboardingRequest.PayloadCase.SCHOOL: {
      path.push('school');
      const entity = tryGetMember(req.getSchool(), log, path);
      const validated = await ValidatedSchool.fromRequest(
        entity,
        log,
        path,
        props
      );
      return validated.logger;
    }
    case OnboardingRequest.PayloadCase.CLASS: {
      path.push('class');
      const entity = tryGetMember(req.getClass(), log, path);
      const validated = await ValidatedClass.fromRequest(
        entity,
        log,
        path,
        props
      );
      return validated.logger;
    }
    case OnboardingRequest.PayloadCase.USER: {
      path.push('user');
      const entity = tryGetMember(req.getUser(), log, path);
      const validated = await ValidatedUser.fromRequest(
        entity,
        log,
        path,
        props
      );
      return validated.logger;
    }
    default:
      throw BAD_REQUEST(
        `If action is of type 'CREATE', payload must be one of 'Organization',
        'School', 'Class' or 'User'`,
        path,
        log,
        props
      );
  }
}
