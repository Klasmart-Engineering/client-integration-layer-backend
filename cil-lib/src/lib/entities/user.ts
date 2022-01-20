import { User as DbUser, Prisma, PrismaClient } from '@prisma/client';
import { Logger } from 'pino';

import {
  BAD_REQUEST,
  Category,
  ENTITY_NOT_FOUND,
  MachineError,
  OnboardingError,
  POSTGRES_GET_KIDSLOOP_ID_QUERY,
  POSTGRES_IS_VALID_QUERY,
  returnMessageOrThrowOnboardingError,
} from '../errors';
import { Entity } from '../types';
import { ExternalUuid, Uuid } from '../utils';

const prisma = new PrismaClient();

export class User {
  public static entity = Entity.USER;
  public static async insertOne(
    user: Prisma.UserCreateInput,
    log: Logger
  ): Promise<void> {
    try {
      await prisma.user.create({
        data: user,
      });
    } catch (error) {
      const msg = returnMessageOrThrowOnboardingError(error);
      throw new OnboardingError(
        MachineError.WRITE,
        msg,
        Category.POSTGRES,
        log,
        [],
        { entityId: user.externalUuid, operation: 'INSERT ONE' }
      );
    }
  }

  public static async findOne(id: ExternalUuid, log: Logger): Promise<DbUser> {
    try {
      const user = await prisma.user.findUnique({
        where: {
          externalUuid: id,
        },
      });
      if (!user) throw ENTITY_NOT_FOUND(id, this.entity, log);
      return user;
    } catch (error) {
      const msg = returnMessageOrThrowOnboardingError(error);
      throw new OnboardingError(
        MachineError.READ,
        msg,
        Category.POSTGRES,
        log,
        [],
        { entityId: id, operation: 'FIND ONE' }
      );
    }
  }

  public static async isValid(id: ExternalUuid, log: Logger): Promise<boolean> {
    try {
      const entity = await prisma.user.findUnique({
        where: {
          externalUuid: id,
        },
        select: {
          externalUuid: true,
        },
      });
      if (entity) return true;
      throw ENTITY_NOT_FOUND(id, this.entity, log);
    } catch (error) {
      const msg = returnMessageOrThrowOnboardingError(error);
      throw POSTGRES_IS_VALID_QUERY(id, this.entity, msg, log);
    }
  }

  public static async getId(id: ExternalUuid, log: Logger): Promise<Uuid> {
    try {
      const klUuid = await prisma.user.findUnique({
        where: {
          externalUuid: id,
        },
        select: {
          klUuid: true,
        },
      });
      if (!klUuid) throw new Error(`${this.entity}: ${id} is not valid`);
      if (klUuid && klUuid.klUuid) return klUuid.klUuid;
      throw ENTITY_NOT_FOUND(id, this.entity, log);
    } catch (error) {
      const msg = returnMessageOrThrowOnboardingError(error);
      throw POSTGRES_GET_KIDSLOOP_ID_QUERY(id, this.entity, msg, log);
    }
  }

  // @TODO
  // Needs rework - school info should be passed as a parameter
  //
  // EXAMPLE ONLY
  public static async validateLinkUserToSchool(
    userId: ExternalUuid,
    schoolId: ExternalUuid,
    log: Logger
  ): Promise<{ klUserUuid: Uuid; schoolKlUuid: Uuid }> {
    const props = { userId, schoolId };
    const user = await prisma.user.findUnique({
      where: {
        externalUuid: userId,
      },
      select: {
        klUuid: true,
        organizations: {
          select: {
            externalUuid: true,
          },
        },
      },
    });
    if (!user) throw ENTITY_NOT_FOUND(userId, this.entity, log, props);
    const school = await prisma.school.findUnique({
      where: {
        externalUuid: schoolId,
      },
      select: {
        klUuid: true,
        organization: {
          select: {
            externalUuid: true,
          },
        },
      },
    });
    if (!school) throw ENTITY_NOT_FOUND(schoolId, Entity.SCHOOL, log, props);
    const isValid = user.organizations.find(
      (o) => o.externalUuid === school.organization.externalUuid
    );
    if (!isValid)
      throw BAD_REQUEST(
        `Tried to link a User to a School where both entities were not part of the
    same organization`,
        [], // @TODO,
        log,
        props
      );
    return { klUserUuid: user.klUuid, schoolKlUuid: school.klUuid };
  }
}
