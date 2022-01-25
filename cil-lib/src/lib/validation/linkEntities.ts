import { Logger } from 'pino';

import { Entity, ExternalUuid, Uuid } from '../..';
import { Class, Link, Organization, School } from '../database';
import {
  BAD_REQUEST,
  BASE_PATH,
  Category,
  MachineError,
  OnboardingError,
  Props,
  tryGetMember,
} from '../errors';
import {
  AddClassesToSchool,
  AddOrganizationRolesToUser,
  AddProgramsToClass,
  AddProgramsToSchool,
  AddUsersToClass,
  AddUsersToOrganization,
  AddUsersToSchool,
  OnboardingRequest,
  Entity as PbEntity,
  Link as PbLink,
} from '../protos/api_pb';
import { actionToString } from '../types/action';
import { Context } from '../utils/context';
import {
  LinkEntityMetadata,
  linkEntitySwitcher,
  LinkEntityTask,
} from '../utils/linkEntitySwitcher';

export type LinkEntitiesRequest = {
  primary: LinkEntity;
  secondary: LinkEntity;
};

export type LinkEntity = {
  entity: Entity;
  identifier: string | Uuid;
};

export async function parseLinkEntities(
  req: OnboardingRequest,
  log: Logger,
  props: Props
): Promise<[PbEntity, ExternalUuid, Logger]> {
  const path = [...BASE_PATH];
  const payload = req.getPayloadCase();
  props.action = actionToString(req.getAction());
  if (payload !== OnboardingRequest.PayloadCase.LINK_ENTITIES)
    throw BAD_REQUEST(
      `If payload is of type 'link_entities', we expect a 'LINK' to be sent`,
      path,
      log,
      props
    );
  const logger = log.child(props);

  path.push('linkEntities');
  const body: PbLink = tryGetMember(req.getLinkEntities(), logger, path);
  const result = await parseAndValidate(body, log, path);

  return [result.protobufEntity, result.targetEntityId, result.log];
}

async function parseAndValidate(
  body: PbLink,
  log: Logger,
  path: string[]
): Promise<LinkEntityMetadata<void>> {
  const tasks: LinkEntityTask<void, undefined> = {
    addUsersToOrganization: validateAddUsersToOrganization,
    addOrganizationRolesToUser: validateAddOrganizationRolesToUser,
    addUsersToSchool: validateAddUsersToSchool,
    addClassesToSchool: validateAddClassesToSchool,
    addProgramsToSchool: validateAddProgramsToSchool,
    addProgramsToClass: validateAddProgramsToClass,
    addUsersToClass: validateAddUsersToClass,
  };
  return await linkEntitySwitcher(body, tasks, log, path);
}

async function validateAddUsersToOrganization(
  link: AddUsersToOrganization,
  log: Logger
): Promise<void> {
  const orgId = link.getExternalOrganizationUuid();
  const ctx = Context.getInstance();
  // Check the target organization is valid
  await ctx.organizationIdIsValid(orgId, log);

  // Check the target users are valid
  await ctx.userIdsAreValid(link.getExternalUserUuidsList(), log);

  // Check the roles are valid
  await ctx.rolesAreValid(link.getRoleIdentifiersList(), orgId, log);
}

async function validateAddOrganizationRolesToUser(
  link: AddOrganizationRolesToUser,
  log: Logger
): Promise<void> {
  const userId = link.getExternalUserUuid();
  const orgId = link.getExternalOrganizationUuid();
  // Check that the user already exists in that organization
  await Link.userBelongsToOrganization(userId, orgId, log);

  const ctx = Context.getInstance();
  // Check that the roles are valid for that organization
  await ctx.rolesAreValid(link.getRoleIdentifiersList(), orgId, log);
}

async function validateAddUsersToSchool(
  link: AddUsersToSchool,
  log: Logger
): Promise<void> {
  const schoolId = link.getExternalSchoolUuid();

  const ctx = Context.getInstance();
  const userIds = link.getExternalUserUuidsList();
  // check the target users are valid
  await ctx.userIdsAreValid(userIds, log);

  // Checking that the school ID is valid is covered by this
  await Link.shareTheSameOrganization(log, [schoolId], undefined, userIds);
}

async function validateAddClassesToSchool(
  link: AddClassesToSchool,
  log: Logger
): Promise<void> {
  const schoolId = link.getExternalSchoolUuid();
  const classIds = link.getExternalClassUuidsList();

  // Checking that both sets of ids are valid are covered by this
  await Link.shareTheSameOrganization(log, [schoolId], classIds);
}

async function validateAddProgramsToSchool(
  link: AddProgramsToSchool,
  log: Logger
): Promise<void> {
  const schoolId = link.getExternalSchoolUuid();
  const orgId = link.getExternalOrganizationUuid();
  await Link.schoolBelongsToOrganization(schoolId, orgId, log);

  const ctx = Context.getInstance();
  await ctx.programsAreValid(link.getProgramNamesList(), orgId, log);
}

async function validateAddProgramsToClass(
  link: AddProgramsToClass,
  log: Logger
): Promise<void> {
  const classId = link.getExternalClassUuid();
  const programs = link.getProgramNamesList();
  const schoolId = (await Class.findOne(classId, log)).externalSchoolUuid;
  const schoolPrograms = await School.getProgramsForSchool(schoolId, log);
  const validPrograms = new Set(schoolPrograms.map((p) => p.name));
  const invalidPrograms = [];
  for (const program of programs) {
    if (validPrograms.has(program)) continue;
    invalidPrograms.push(program);
  }
  if (invalidPrograms.length > 0)
    throw new OnboardingError(
      MachineError.VALIDATION,
      `Programs: ${invalidPrograms.join(
        ', '
      )} do not belong to the parent school ${schoolId}. Any programs associated with a class must be present in their parent school`,
      Category.REQUEST,
      log
    );
}

async function validateAddUsersToClass(
  link: AddUsersToClass,
  log: Logger
): Promise<void> {
  const classId = link.getExternalClassUuid();
  const students = link.getExternalStudentUuidList();
  const teachers = link.getExternalTeacherUuidList();
  const schoolId = (await Class.findOne(classId, log)).externalSchoolUuid;
  const { invalid } = await Link.usersBelongToSchool(
    [...students, ...teachers],
    schoolId,
    log
  );
  if (invalid.length === 0) return;
  throw new OnboardingError(
    MachineError.VALIDATION,
    `Users: ${invalid.join(
      ', '
    )} do not belong to the same parent school as the class ${classId}. When attempting to add users to a class they must share the same parent school`,
    Category.REQUEST,
    log
  );
}
