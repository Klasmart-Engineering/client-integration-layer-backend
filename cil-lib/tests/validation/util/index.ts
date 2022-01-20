import { Logger } from 'pino';
import sinon from 'sinon';
import { v4 as uuidv4 } from 'uuid';

import {
  Class,
  OnboardingRequest,
  Organization,
  School,
  User,
} from '../../../src/lib/protos';

export function wrapRequest<T>(data: T): OnboardingRequest {
  const req = new OnboardingRequest();
  req.setRequestId(uuidv4());
  if (data instanceof Organization) req.setOrganization(data);
  if (data instanceof School) req.setSchool(data);
  if (data instanceof Class) req.setClass(data);
  if (data instanceof User) req.setUser(data);
  return req;
}

export const LOG_STUB = {
  error: sinon.fake(),
  warn: sinon.fake(),
  info: sinon.fake(),
  debug: sinon.fake(),
  trace: sinon.fake(),
  child: sinon.fake(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any as Logger;

LOG_STUB.child = () => LOG_STUB;
