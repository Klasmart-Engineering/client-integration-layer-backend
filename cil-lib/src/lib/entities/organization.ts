import { Organization as DbOrg, Prisma, PrismaClient } from '@prisma/client';

import { Category, MachineError, OnboardingError } from '../errors';
import { Organization as Org } from '../protos/api_pb';
import { AdminService } from '../services/adminService';
import { Entity } from '../types';
import { ClientUuid } from '../utils';

const prisma = new PrismaClient();

export class Organization {
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
        { entityId: organization.clientUuid, operation: 'INSERT ONE' }
      );
    }
  }

  public static async findOne(id: ClientUuid): Promise<DbOrg> {
    try {
      const org = await prisma.organization.findUnique({
        where: {
          clientUuid: id,
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

  public static async isValid(id: ClientUuid): Promise<void> {
    try {
      const count = await prisma.organization.count({
        where: {
          clientUuid: id,
        },
      });
      if (count === 1) return;
      throw new Error(`Organization: ${id} is not valid`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : `${error}`;
      throw new OnboardingError(
        MachineError.VALIDATION,
        msg,
        Entity.ORGANIZATION,
        Category.POSTGRES,
        { entityId: id, operation: 'IS VALID' }
      );
    }
  }

  public static async getPrograms(id: ClientUuid): Promise<string[]> {
    try {
      const programs = await prisma.organization.findUnique({
        where: {
          clientUuid: id,
        },
        select: {
          programUuids: true,
        },
      });
      if (!programs) throw new Error(`Organization: ${id} not found`);
      return programs.programUuids;
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
    orgId: ClientUuid,
    programs: ClientUuid[]
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

  public static async getRoles(id: ClientUuid): Promise<ClientUuid[]> {
    try {
      const roles = await prisma.organization.findUnique({
        where: {
          clientUuid: id,
        },
        select: {
          roleUuids: true,
        },
      });
      if (!roles) throw new Error(`Organization: ${id} not found`);
      return roles.roleUuids;
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
    orgId: ClientUuid,
    roles: ClientUuid[]
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

  public static async initializeOrganization(org: Org): Promise<void> {
    const admin = await AdminService.getInstance();
    const name = org.getName();
    const clientUuid = org.getClientUuid();
    const klUuid = await admin.getOrganization(name);
    const systemPrograms = await admin.getSystemPrograms();
    const systemRoles = await admin.getSystemRoles();
    const customPrograms = await admin.getOrganizationPrograms(klUuid);
    const customRoles = await admin.getOrganizationRoles(klUuid);
    const programUuids = systemPrograms.concat(customPrograms);
    const roleUuids = systemRoles.concat(customRoles);

    await Organization.insertOne({
      clientUuid,
      klUuid,
      roleUuids,
      programUuids,
    });
  }
}
