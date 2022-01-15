import { Organization as DbOrg, Prisma, PrismaClient } from '@prisma/client';
import { Logger } from 'pino';

import {
  Category,
  MachineError,
  OnboardingError,
  POSTGRES_GET_KIDSLOOP_ID_QUERY,
  POSTGRES_IS_VALID_QUERY,
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
    organization: Prisma.OrganizationCreateInput
  ): Promise<void> {
    try {
      await prisma.organization.create({
        data: organization,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : `${error}`;
      throw new OnboardingError(
        MachineError.WRITE,
        msg,
        Entity.ORGANIZATION,
        Category.POSTGRES,
        { entityId: organization.externalUuid, operation: 'INSERT ONE' }
      );
    }
  }

  public static async findOne(id: ExternalUuid): Promise<DbOrg> {
    try {
      const org = await prisma.organization.findUnique({
        where: {
          externalUuid: id,
        },
      });
      if (!org) throw new Error(`Organization: ${id} not found`);
      return org;
    } catch (error) {
      const msg = error instanceof Error ? error.message : `${error}`;
      throw new OnboardingError(
        MachineError.READ,
        msg,
        Entity.ORGANIZATION,
        Category.POSTGRES,
        { entityId: id, operation: 'FIND ONE' }
      );
    }
  }

  public static async isValid(id: ExternalUuid, log: Logger): Promise<boolean> {
    try {
      const school = await prisma.organization.findFirst({
        where: {
          externalUuid: id,
        },
        select: {
          externalUuid: true,
        },
      });
      if (school) return true;
      throw new Error(`${this.entity}: ${id} is not valid`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : `${error}`;
      throw POSTGRES_IS_VALID_QUERY(id, this.entity, msg, log);
    }
  }

  public static async getId(id: ExternalUuid, log: Logger): Promise<Uuid> {
    try {
      const klUuid = await prisma.organization.findUnique({
        where: {
          externalUuid: id,
        },
        select: {
          klUuid: true,
        },
      });
      if (!klUuid) throw new Error(`${this.entity}: ${id} is not valid`);
      if (klUuid && klUuid.klUuid) return klUuid.klUuid;
      throw new Error(`Unable to find KidsLoop ID for ${this.entity}: ${id}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : `${error}`;
      throw POSTGRES_GET_KIDSLOOP_ID_QUERY(id, this.entity, msg, log);
    }
  }

  public static async getPrograms(id: ExternalUuid): Promise<string[]> {
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
      if (!programs) throw new Error(`Organization: ${id} not found`);
      return programs.programs.map((p) => p.klUuid);
    } catch (error) {
      const msg = error instanceof Error ? error.message : `${error}`;
      throw new OnboardingError(
        MachineError.READ,
        msg,
        Entity.ORGANIZATION,
        Category.POSTGRES,
        { entityId: id, operation: 'GET PROGRAMS' }
      );
    }
  }

  public static async programsAreValid(
    orgId: ExternalUuid,
    programs: ExternalUuid[]
  ): Promise<void> {
    const validPrograms = new Set(await Organization.getPrograms(orgId));
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
        Entity.PROGRAM,
        Category.REQUEST,
        { entityIds: programs, operation: 'PROGRAMS ARE VALID' }
      );
  }

  public static async getRoles(id: ExternalUuid): Promise<ExternalUuid[]> {
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
      if (!roles) throw new Error(`Organization: ${id} not found`);
      return roles.roles.map((r) => r.klUuid);
    } catch (error) {
      const msg = error instanceof Error ? error.message : `${error}`;
      throw new OnboardingError(
        MachineError.READ,
        msg,
        Entity.ORGANIZATION,
        Category.POSTGRES,
        { entityId: id, operation: 'GET ROLES' }
      );
    }
  }

  public static async rolesAreValid(
    orgId: ExternalUuid,
    roles: ExternalUuid[]
  ): Promise<void> {
    const validRoles = new Set(await Organization.getRoles(orgId));
    const invalidRoles = [];
    for (const role of roles) {
      if (!validRoles.has(role)) invalidRoles.push(role);
    }
    if (invalidRoles.length > 0)
      throw new OnboardingError(
        MachineError.VALIDATION,
        `Roles: ${invalidRoles.join(', ')} are invalid`,
        Entity.ROLE,
        Category.REQUEST,
        { entityIds: roles, operation: 'ROLES ARE VALID' }
      );
  }

  public static async initializeOrganization(
    org: Org.AsObject,
    log: Logger
  ): Promise<void> {
    const admin = await AdminService.getInstance();
    const { name, externalUuid } = org;
    const klUuid = await admin.getOrganization(name);
    const systemPrograms = await admin.getSystemPrograms();
    const systemRoles = await admin.getSystemRoles();
    const customPrograms = await admin.getOrganizationPrograms(klUuid);
    const customRoles = await admin.getOrganizationRoles(klUuid);
    const programUuids = systemPrograms.concat(customPrograms);
    const roleUuids = systemRoles.concat(customRoles);

    await Organization.insertOne({
      externalUuid,
      klUuid,
      name,
    });
    await Program.insertMany(programUuids, externalUuid);
    await Role.insertMany(roleUuids, externalUuid);
  }
}
