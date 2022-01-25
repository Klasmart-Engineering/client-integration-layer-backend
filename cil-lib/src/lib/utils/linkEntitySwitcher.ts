import camelCase from 'lodash.camelcase';
import { Logger } from 'pino';

import { BAD_REQUEST, Entity, ExternalUuid, tryGetMember } from '../..';
import {
  AddClassesToSchool,
  AddOrganizationRolesToUser,
  AddProgramsToClass,
  AddProgramsToSchool,
  AddUsersToClass,
  AddUsersToOrganization,
  AddUsersToSchool,
  Link,
  Entity as PbEntity,
} from '../protos/api_pb';

export interface LinkEntityTask<T, U> {
  addUsersToOrganization: (
    link: AddUsersToOrganization,
    log: Logger,
    additionalData?: U
  ) => Promise<T>;
  addOrganizationRolesToUser: (
    link: AddOrganizationRolesToUser,
    log: Logger,
    additionalData?: U
  ) => Promise<T>;
  addUsersToSchool: (
    link: AddUsersToSchool,
    log: Logger,
    additionalData?: U
  ) => Promise<T>;
  addClassesToSchool: (
    link: AddClassesToSchool,
    log: Logger,
    additionalData?: U
  ) => Promise<T>;
  addProgramsToSchool: (
    link: AddProgramsToSchool,
    log: Logger,
    additionalData?: U
  ) => Promise<T>;
  addProgramsToClass: (
    link: AddProgramsToClass,
    log: Logger,
    additionalData?: U
  ) => Promise<T>;
  addUsersToClass: (
    link: AddUsersToClass,
    log: Logger,
    additionalData?: U
  ) => Promise<T>;
}

export type LinkEntityMetadata<T> = {
  protobufEntity: PbEntity;
  targetEntityId: ExternalUuid;
  log: Logger;
  taskResult: T;
};

export async function linkEntitySwitcher<T, U>(
  req: Link,
  tasks: LinkEntityTask<T, U>,
  log: Logger,
  path: string[],
  additonalData?: U
): Promise<LinkEntityMetadata<T>> {
  let pbEntity: PbEntity;
  let targetEntity: Entity;
  let targetEntityId: ExternalUuid;
  let logger = log;
  let result: T;
  const linkOperation = camelCase(Link.LinkCase[req.getLinkCase()]);
  switch (req.getLinkCase()) {
    case Link.LinkCase.ADD_USERS_TO_ORGANIZATION: {
      pbEntity = PbEntity.ORGANIZATION;
      targetEntity = Entity.ORGANIZATION;
      const payload = tryGetMember(req.getAddUsersToOrganization(), logger, [
        ...path,
        linkOperation,
      ]);
      targetEntityId = payload.getExternalOrganizationUuid();
      logger = logger.child({
        linkOperation,
        targetEntity,
        targetEntityId,
      });
      result = await tasks.addUsersToOrganization(payload, log, additonalData);
      break;
    }
    case Link.LinkCase.ADD_ORGANIZATION_ROLES_TO_USER: {
      pbEntity = PbEntity.ORGANIZATION;
      targetEntity = Entity.ORGANIZATION;
      const payload = tryGetMember(
        req.getAddOrganizationRolesToUser(),
        logger,
        [...path, linkOperation]
      );
      targetEntityId = payload.getExternalOrganizationUuid();
      logger = logger.child({
        linkOperation,
        targetEntity,
        targetEntityId,
      });
      result = await tasks.addOrganizationRolesToUser(
        payload,
        log,
        additonalData
      );
      break;
    }
    case Link.LinkCase.ADD_USERS_TO_SCHOOL: {
      pbEntity = PbEntity.SCHOOL;
      targetEntity = Entity.SCHOOL;
      const payload = tryGetMember(req.getAddUsersToSchool(), logger, [
        ...path,
        linkOperation,
      ]);
      targetEntityId = payload.getExternalSchoolUuid();
      logger = logger.child({
        linkOperation,
        targetEntity,
        targetEntityId,
      });
      result = await tasks.addUsersToSchool(payload, log, additonalData);
      break;
    }
    case Link.LinkCase.ADD_CLASSES_TO_SCHOOL: {
      pbEntity = PbEntity.SCHOOL;
      targetEntity = Entity.SCHOOL;
      const payload = tryGetMember(req.getAddClassesToSchool(), logger, [
        ...path,
        linkOperation,
      ]);
      targetEntityId = payload.getExternalSchoolUuid();
      logger = logger.child({
        linkOperation,
        targetEntity,
        targetEntityId,
      });
      result = await tasks.addClassesToSchool(payload, log, additonalData);
      break;
    }
    case Link.LinkCase.ADD_PROGRAMS_TO_SCHOOL: {
      pbEntity = PbEntity.SCHOOL;
      targetEntity = Entity.SCHOOL;
      const payload = tryGetMember(req.getAddProgramsToSchool(), logger, [
        ...path,
        linkOperation,
      ]);
      targetEntityId = payload.getExternalSchoolUuid();
      logger = logger.child({
        linkOperation,
        targetEntity,
        targetEntityId,
      });
      result = await tasks.addProgramsToSchool(payload, log, additonalData);
      break;
    }
    case Link.LinkCase.ADD_PROGRAMS_TO_CLASS: {
      pbEntity = PbEntity.CLASS;
      targetEntity = Entity.CLASS;
      const payload = tryGetMember(req.getAddProgramsToClass(), logger, [
        ...path,
        linkOperation,
      ]);
      targetEntityId = payload.getExternalClassUuid();
      logger = logger.child({
        linkOperation,
        targetEntity,
        targetEntityId,
      });
      result = await tasks.addProgramsToClass(payload, log, additonalData);
      break;
    }
    case Link.LinkCase.ADD_USERS_TO_CLASS: {
      pbEntity = PbEntity.CLASS;
      targetEntity = Entity.CLASS;
      const payload = tryGetMember(req.getAddUsersToClass(), logger, [
        ...path,
        linkOperation,
      ]);
      targetEntityId = payload.getExternalClassUuid();
      logger = logger.child({
        linkOperation,
        targetEntity,
        targetEntityId,
      });
      result = await tasks.addUsersToClass(payload, log, additonalData);
      break;
    }
    default:
      throw BAD_REQUEST(
        `A 'Link' request must provide one of the specified payloads`,
        path,
        log
      );
  }
  return {
    protobufEntity: pbEntity,
    targetEntityId,
    log: logger,
    taskResult: result,
  };
}
