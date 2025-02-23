import { Logger } from 'pino';
import sinon from 'sinon';
import { v4 as uuidv4 } from 'uuid';

import {
  AddOrganizationRolesToUser,
  AddClassesToSchool,
  AddProgramsToClass,
  AddProgramsToSchool,
  AddUsersToSchool,
  AddUsersToOrganization,
  BatchOnboarding,
  Class,
  Link,
  OnboardingRequest,
  Organization,
  RequestMetadata,
  School,
  User,
  AddUsersToClass,
} from '../../src/lib/protos';

export function wrapRequest<T>(data: T): BatchOnboarding {
  const req = new OnboardingRequest();
  req.setRequestId(new RequestMetadata().setId(uuidv4()).setN(uuidv4()));
  if (data instanceof Organization) req.setOrganization(data);
  if (data instanceof School) req.setSchool(data);
  if (data instanceof Class) req.setClass(data);
  if (data instanceof User) req.setUser(data);
  if (data instanceof AddProgramsToClass)
    req.setLinkEntities(new Link().setAddProgramsToClass(data));
  if (data instanceof AddOrganizationRolesToUser)
    req.setLinkEntities(new Link().setAddOrganizationRolesToUser(data));
  if (data instanceof AddProgramsToClass)
    req.setLinkEntities(new Link().setAddProgramsToClass(data));
  if (data instanceof AddProgramsToSchool)
    req.setLinkEntities(new Link().setAddProgramsToSchool(data));
  if (data instanceof AddUsersToSchool)
    req.setLinkEntities(new Link().setAddUsersToSchool(data));
  if (data instanceof AddUsersToOrganization)
    req.setLinkEntities(new Link().setAddUsersToOrganization(data));
  if (data instanceof AddUsersToClass)
    req.setLinkEntities(new Link().setAddUsersToClass(data));
  if (data instanceof AddProgramsToClass)
    req.setLinkEntities(new Link().setAddProgramsToClass(data));
  if (data instanceof AddClassesToSchool)
    req.setLinkEntities(new Link().setAddClassesToSchool(data));
  return new BatchOnboarding().setRequestsList([req]);
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

// @ts-ignore
LOG_STUB.child = () => LOG_STUB;
