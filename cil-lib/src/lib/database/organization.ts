import { Organization as DbOrg, Prisma, PrismaClient } from '@prisma/client';
import { Logger } from 'pino';

import {
  Category,
  ENTITY_NOT_FOUND,
  Errors,
  MachineError,
  OnboardingError,
  POSTGRES_GET_KIDSLOOP_ID_QUERY,
  POSTGRES_IS_VALID_QUERY,
  returnMessageOrThrowOnboardingError,
} from '../errors';
import { Organization as Org } from '../protos/api_pb';
import { AdminService } from '../services/adminService';
import { Entity } from '../types';
import { ExternalUuid, Uuid } from '../utils';

import { Program } from './program';
import { Role } from './role';

const prisma = new PrismaClient();

export class Organization {
  public static entity = Entity.ORGANIZATION;

  public static async insertOne(
    organization: Prisma.OrganizationCreateInput,
    log: Logger
  ): Promise<void> {
    try {
      const alreadyExists = await prisma.organization.findUnique({
        where: {
          klUuid: organization.klUuid,
        },
        select: {
          klUuid: true,
        },
      });
      if (alreadyExists && alreadyExists.klUuid) return;
      await prisma.organization.create({
        data: organization,
      });
    } catch (error) {
      const msg = returnMessageOrThrowOnboardingError(error);
      throw new OnboardingError(
        MachineError.WRITE,
        msg,
        Category.POSTGRES,
        log,
        [],
        { entityId: organization.externalUuid, queryType: 'INSERT ONE' }
      );
    }
  }

  public static async findOne(id: ExternalUuid, log: Logger): Promise<DbOrg> {
    try {
      const org = await prisma.organization.findUnique({
        where: {
          externalUuid: id,
        },
      });
      if (!org) throw ENTITY_NOT_FOUND(id, this.entity, log);
      return org;
    } catch (error) {
      const msg = returnMessageOrThrowOnboardingError(error);
      throw new OnboardingError(
        MachineError.READ,
        msg,
        Category.POSTGRES,
        log,
        [],
        { entityId: id, queryType: 'FIND ONE' }
      );
    }
  }

  public static async isValid(id: ExternalUuid, log: Logger): Promise<boolean> {
    try {
      const school = await prisma.organization.findUnique({
        where: {
          externalUuid: id,
        },
        select: {
          externalUuid: true,
        },
      });
      if (school) return true;
      throw ENTITY_NOT_FOUND(id, this.entity, log);
    } catch (error) {
      const msg = returnMessageOrThrowOnboardingError(error);
      throw POSTGRES_IS_VALID_QUERY(id, this.entity, msg, log);
    }
  }

  public static async getKidsloopId(
    id: ExternalUuid,
    log: Logger,
    shouldLogNotFoundError = true
  ): Promise<Uuid> {
    try {
      const klUuid = await prisma.organization.findUnique({
        where: {
          externalUuid: id,
        },
        select: {
          klUuid: true,
        },
      });
      if (klUuid && klUuid.klUuid) return klUuid.klUuid;
      throw ENTITY_NOT_FOUND(id, this.entity, log, {}, shouldLogNotFoundError);
    } catch (error) {
      const msg = returnMessageOrThrowOnboardingError(error);
      throw POSTGRES_GET_KIDSLOOP_ID_QUERY(id, this.entity, msg, log);
    }
  }

  public static async getPrograms(
    id: ExternalUuid,
    log: Logger
  ): Promise<string[]> {
    try {
      const programs = await prisma.organization.findUnique({
        where: {
          externalUuid: id,
        },
        select: {
          programs: {
            select: {
              klUuid: true,
            },
          },
        },
      });
      if (!programs) throw ENTITY_NOT_FOUND(id, this.entity, log);
      return programs.programs.map((p) => p.klUuid);
    } catch (error) {
      const msg = returnMessageOrThrowOnboardingError(error);
      throw new OnboardingError(
        MachineError.READ,
        msg,
        Category.POSTGRES,
        log,
        [],
        { entityId: id, queryType: 'GET PROGRAMS' }
      );
    }
  }

  public static async programsAreValid(
    orgId: ExternalUuid,
    programs: ExternalUuid[],
    log: Logger
  ): Promise<void> {
    const validPrograms = new Set(await Organization.getPrograms(orgId, log));
    const invalidPrograms = [];
    for (const program of programs) {
      if (!validPrograms.has(program)) invalidPrograms.push(program);
    }
    if (invalidPrograms.length > 0)
      throw new OnboardingError(
        MachineError.VALIDATION,
        `Programs: ${invalidPrograms.join(
          ', '
        )} are invalid when comparing to the parent Organization ${orgId}`,
        Category.REQUEST,
        log,
        [],
        { entityIds: programs, queryType: 'PROGRAMS ARE VALID' }
      );
  }

  public static async getRoles(
    id: ExternalUuid,
    log: Logger
  ): Promise<ExternalUuid[]> {
    try {
      const roles = await prisma.organization.findUnique({
        where: {
          externalUuid: id,
        },
        select: {
          roles: {
            select: {
              klUuid: true,
            },
          },
        },
      });
      if (!roles) throw ENTITY_NOT_FOUND(id, this.entity, log);
      return roles.roles.map((r) => r.klUuid);
    } catch (error) {
      const msg = returnMessageOrThrowOnboardingError(error);
      throw new OnboardingError(
        MachineError.READ,
        msg,
        Category.POSTGRES,
        log,
        [],
        { entityId: id, queryType: 'GET ROLES' }
      );
    }
  }

  public static async initializeOrganization(
    org: Org.AsObject,
    logger: Logger
  ): Promise<void> {
    const log = logger.child({ organization: org.name });
    const errors: (OnboardingError | Errors)[] = [];
    try {
      const admin = await AdminService.getInstance();
      const { name, externalUuid } = org;
      log.info(
        `Attempting to fetch data for organization from the admin service`
      );
      const klUuid = await admin.getOrganization(name, log);
      const customPrograms = await admin.getOrganizationPrograms(klUuid, log);
      const customRoles = await admin.getOrganizationRoles(klUuid, log);
      log.debug(`Fetched organization data from the admin service`);

      try {
        log.info(`Attempting to write organization data to the database`);
        await Organization.insertOne(
          {
            externalUuid,
            klUuid,
            name,
          },
          log
        );
      } catch (error) {
        pushErrorIntoArray(error, errors, log);
      }
      try {
        log.info(`Attempting to write organization's programs to the database`);
        await Program.insertMany(customPrograms, externalUuid, log);
      } catch (error) {
        pushErrorIntoArray(error, errors, log);
      }
      try {
        log.info(`Attempting to write organization's roles to the database`);
        await Role.insertMany(customRoles, externalUuid, log);
      } catch (error) {
        pushErrorIntoArray(error, errors, log);
      }
      if (errors.length > 0) throw new Errors(errors);
    } catch (error) {
      const msg = returnMessageOrThrowOnboardingError(error);
      throw new OnboardingError(
        MachineError.VALIDATION,
        msg,
        Category.REQUEST,
        log
      );
    }
  }
}

const pushErrorIntoArray = (
  error: unknown,
  arr: (OnboardingError | Errors)[],
  log: Logger
): void => {
  if (error instanceof OnboardingError || error instanceof Errors) {
    arr.push(error);
  } else {
    const msg = error instanceof Error ? error.message : `${error}`;
    arr.push(
      new OnboardingError(MachineError.VALIDATION, msg, Category.REQUEST, log)
    );
  }
};
