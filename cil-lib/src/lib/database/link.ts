import { PrismaClient } from '@prisma/client';
import { Logger } from 'pino';

import {
  Category,
  ENTITY_NOT_FOUND_FOR,
  MachineError,
  OnboardingError,
  returnMessageOrThrowOnboardingError,
} from '../errors';
import { Entity } from '../types';
import { ExternalUuid, Uuid } from '../utils';

const prisma = new PrismaClient();

export class Link {
  /**
   *
   * @returns the kidsloop id of the user in the UserLinkOrganization table
   * @throws if the user is invalid for the given organization
   */
  public static async schoolBelongsToOrganization(
    schoolId: ExternalUuid,
    organizationId: ExternalUuid,
    log: Logger
  ): Promise<Uuid> {
    try {
      const school = await prisma.school.findUnique({
        where: {
          externalUuid: schoolId,
        },
        select: {
          klUuid: true,
          externalOrgUuid: true,
        },
      });
      if (!school)
        throw ENTITY_NOT_FOUND_FOR(
          schoolId,
          Entity.SCHOOL,
          organizationId,
          Entity.ORGANIZATION,
          log,
          { operation: 'school belongs to organization' }
        );
      if (school.externalOrgUuid !== organizationId)
        throw new OnboardingError(
          MachineError.VALIDATION,
          `School ${schoolId} does not belong organization ${organizationId}`,
          Category.REQUEST,
          log
        );
      return school.klUuid;
    } catch (error) {
      const msg = returnMessageOrThrowOnboardingError(error);
      throw new OnboardingError(
        MachineError.READ,
        msg,
        Category.POSTGRES,
        log,
        [],
        { entityId: schoolId, operation: 'school belongs to organization' }
      );
    }
  }
  /**
   *
   * @returns the kidsloop id of the user in the UserLinkOrganization table
   * @throws if the user is invalid for the given organization
   */
  public static async userBelongsToOrganization(
    userId: ExternalUuid,
    organizationId: ExternalUuid,
    log: Logger
  ): Promise<Uuid> {
    try {
      const user = await prisma.userLinkOrganization.findUnique({
        where: {
          externalUuid_externalOrgUuid: {
            externalUuid: userId,
            externalOrgUuid: organizationId,
          },
        },
        select: {
          user: {
            select: {
              klUuid: true,
            },
          },
        },
      });
      if (!user)
        throw ENTITY_NOT_FOUND_FOR(
          userId,
          Entity.USER,
          organizationId,
          Entity.ORGANIZATION,
          log,
          { operation: 'user belongs to organization' }
        );
      return user.user.klUuid;
    } catch (error) {
      const msg = returnMessageOrThrowOnboardingError(error);
      throw new OnboardingError(
        MachineError.READ,
        msg,
        Category.POSTGRES,
        log,
        [],
        { entityId: userId, operation: 'user belongs to organization' }
      );
    }
  }

  /**
   * @returns the kidsloop id of the user in the UserLinkSchool table
   * @throws if the user is invalid for the given school
   */
  public static async userBelongsToSchool(
    userId: ExternalUuid,
    schoolId: ExternalUuid,
    log: Logger
  ): Promise<Uuid> {
    try {
      const user = await prisma.userLinkSchool.findUnique({
        where: {
          externalUuid_externalSchoolUuid: {
            externalUuid: userId,
            externalSchoolUuid: schoolId,
          },
        },
        select: {
          user: {
            select: {
              klUuid: true,
            },
          },
        },
      });
      if (!user)
        throw ENTITY_NOT_FOUND_FOR(
          userId,
          Entity.USER,
          schoolId,
          Entity.SCHOOL,
          log,
          { operation: 'user belongs to school' }
        );
      return user.user.klUuid;
    } catch (error) {
      const msg = returnMessageOrThrowOnboardingError(error);
      throw new OnboardingError(
        MachineError.READ,
        msg,
        Category.POSTGRES,
        log,
        [],
        { entityId: userId, operation: 'user belongs to school' }
      );
    }
  }

  public static async usersBelongToSchool(
    userIds: ExternalUuid[],
    schoolId: ExternalUuid,
    log: Logger
  ): Promise<{ valid: ExternalUuid[]; invalid: ExternalUuid[] }> {
    try {
      const validUsers = await prisma.userLinkSchool.findMany({
        where: {
          AND: [
            {
              externalUuid: {
                in: userIds,
              },
            },
            {
              externalSchoolUuid: schoolId,
            },
          ],
        },
        select: {
          user: {
            select: {
              externalUuid: true,
            },
          },
        },
      });

      const toValidate = new Set(userIds);
      const valid = [];
      for (const {
        user: { externalUuid },
      } of validUsers) {
        // delete returns true if the user was in the list
        if (toValidate.delete(externalUuid)) {
          valid.push(externalUuid);
        }
      }
      return { valid: valid, invalid: Array.from(toValidate) };
    } catch (error) {
      const msg = returnMessageOrThrowOnboardingError(error);
      throw new OnboardingError(
        MachineError.READ,
        msg,
        Category.POSTGRES,
        log,
        [],
        { entityIds: userIds, operation: 'users belong to school' }
      );
    }
  }

  /**
   *
   * @throws if any of the provided arguments don't share the same org
   */
  public static async shareTheSameOrganization(
    log: Logger,
    schoolIds?: ExternalUuid[],
    classIds?: ExternalUuid[],
    userIds?: ExternalUuid[]
  ): Promise<void> {
    const promises = [];
    if (schoolIds && schoolIds.length > 0) {
      promises.push(this.getSchoolIdsParentOrgs(schoolIds, log));
    }
    if (classIds && classIds.length > 0) {
      promises.push(this.getClassIdsParentOrgs(classIds, log));
    }
    if (userIds && userIds.length > 0) {
      promises.push(this.getUserIdsParentOrgs(userIds, log));
    }
    const result = await Promise.all(promises);
    const orgIds = result.flat();
    if (orgIds.length === 0)
      throw new OnboardingError(
        MachineError.VALIDATION,
        'No ids were provided so we are unable to link any entities',
        Category.REQUEST,
        log
      );
    const targetOrg = orgIds[0];
    if (orgIds.every((id) => id === targetOrg)) return;
    throw new OnboardingError(
      MachineError.VALIDATION,
      `The entities provided don't share the same parent organization and
      therefore cannot be linked`,
      Category.REQUEST,
      log
    );
  }

  private static async getSchoolIdsParentOrgs(
    schoolIds: ExternalUuid[],
    log: Logger
  ): Promise<ExternalUuid[]> {
    try {
      const schools = await prisma.school.findMany({
        where: {
          externalUuid: {
            in: schoolIds,
          },
        },
        select: {
          externalOrgUuid: true,
        },
      });
      if (schools.length !== schoolIds.length)
        throw new OnboardingError(
          MachineError.READ,
          `Expected to find ${schoolIds.length} valid schools when looking up
        school ids, however only found ${schools.length}`,
          Category.REQUEST,
          log
        );
      return schools.map((s) => s.externalOrgUuid);
    } catch (error) {
      const msg = returnMessageOrThrowOnboardingError(error);
      throw new OnboardingError(MachineError.READ, msg, Category.POSTGRES, log);
    }
  }

  private static async getClassIdsParentOrgs(
    classIds: ExternalUuid[],
    log: Logger
  ): Promise<ExternalUuid[]> {
    try {
      const classes = await prisma.class.findMany({
        where: {
          externalUuid: {
            in: classIds,
          },
        },
        select: {
          externalOrgUuid: true,
        },
      });
      if (classes.length !== classIds.length)
        throw new OnboardingError(
          MachineError.READ,
          `Expected to find ${classIds.length} valid classes when looking up
        class ids, however only found ${classes.length}`,
          Category.REQUEST,
          log
        );
      return classes.map((s) => s.externalOrgUuid);
    } catch (error) {
      const msg = returnMessageOrThrowOnboardingError(error);
      throw new OnboardingError(MachineError.READ, msg, Category.POSTGRES, log);
    }
  }

  private static async getUserIdsParentOrgs(
    userIds: ExternalUuid[],
    log: Logger
  ): Promise<ExternalUuid[]> {
    try {
      const users = await prisma.userLinkOrganization.findMany({
        where: {
          externalUuid: {
            in: userIds,
          },
        },
        select: {
          externalOrgUuid: true,
        },
      });
      if (users.length !== userIds.length)
        throw new OnboardingError(
          MachineError.READ,
          `Expected to find ${userIds.length} valid users when looking up
        user ids, however only found ${users.length}`,
          Category.REQUEST,
          log
        );
      return users.map((s) => s.externalOrgUuid);
    } catch (error) {
      const msg = returnMessageOrThrowOnboardingError(error);
      throw new OnboardingError(MachineError.READ, msg, Category.POSTGRES, log);
    }
  }

  public static async linkProgramToSchool(
    programId: string,
    schoolId: string,
    log: Logger
  ): Promise<Uuid> {
    try {
      const result = await prisma.programLink.create({
        data: {
          school: {
            connect: {
              klUuid: schoolId,
            },
          },
          program: {
            connect: { klUuid: programId },
          },
        },
      });
      if (!result)
        throw ENTITY_NOT_FOUND_FOR(
          programId,
          Entity.PROGRAM,
          schoolId,
          Entity.SCHOOL,
          log,
          { operation: 'link program to school' }
        );
      return result.klUuid;
    } catch (error) {
      const msg = returnMessageOrThrowOnboardingError(error);
      throw new OnboardingError(
        MachineError.WRITE,
        msg,
        Category.POSTGRES,
        log,
        [],
        {
          operation: 'link program to school',
          targetEntityId: schoolId,
        }
      );
    }
  }

  public static async linkUserToOrg(
    userId: string,
    orgId: string,
    log: Logger
  ): Promise<Uuid> {
    try {
      const result = await prisma.userLinkOrganization.create({
        data: {
          user: {
            connect: {
              klUuid: userId,
            },
          },
          organization: {
            connect: { klUuid: orgId },
          },
        },
      });
      if (!result)
        throw ENTITY_NOT_FOUND_FOR(
          userId,
          Entity.USER,
          orgId,
          Entity.ORGANIZATION,
          log,
          { operation: 'link user to organization' }
        );
      return result.id;
    } catch (error) {
      const msg = returnMessageOrThrowOnboardingError(error);
      throw new OnboardingError(
        MachineError.WRITE,
        msg,
        Category.POSTGRES,
        log,
        [],
        {
          operation: 'link user to organization',
          entity: userId,
          targetEntityId: orgId,
        }
      );
    }
  }
}
