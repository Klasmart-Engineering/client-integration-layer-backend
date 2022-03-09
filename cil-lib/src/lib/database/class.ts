import { Class as DbClass, Prisma, PrismaClient } from '@prisma/client';
import { Logger } from 'pino';

import {
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

export class Class {
  public static entity = Entity.CLASS;

  public static async insertOne(
    externalUuid: ExternalUuid,
    kidsloopUuid: Uuid,
    externalOrgUuid: ExternalUuid,
    log: Logger
  ): Promise<void> {
    try {
      const c: Prisma.ClassCreateInput = {
        externalUuid,
        klUuid: kidsloopUuid,
        organization: {
          connect: { externalUuid: externalOrgUuid },
        },
      };
      await prisma.class.create({
        data: c,
      });
    } catch (error) {
      const msg = returnMessageOrThrowOnboardingError(error);
      throw new OnboardingError(
        MachineError.WRITE,
        msg,
        Category.POSTGRES,
        log,
        [],
        { entityId: externalUuid, statement: 'INSERT ONE' }
      );
    }
  }

  public static async linkToSchool(
    externalUuid: ExternalUuid,
    schoolId: ExternalUuid,
    log: Logger
  ): Promise<void> {
    try {
      await prisma.classLinkSchool.create({
        data: {
          class: {
            connect: {
              externalUuid,
            },
          },
          school: {
            connect: {
              externalUuid: schoolId,
            },
          },
        },
      });
    } catch (error) {
      const msg = returnMessageOrThrowOnboardingError(error);
      throw new OnboardingError(
        MachineError.WRITE,
        msg,
        Category.POSTGRES,
        log,
        [],
        { entityId: externalUuid, statement: 'LINK CLASS TO SCHOOL' }
      );
    }
  }

  public static async findOne(id: ExternalUuid, log: Logger): Promise<DbClass> {
    try {
      const c = await prisma.class.findUnique({
        where: {
          externalUuid: id,
        },
      });
      if (!c) throw ENTITY_NOT_FOUND(id, this.entity, log);
      return c;
    } catch (error) {
      const msg = returnMessageOrThrowOnboardingError(error);
      throw new OnboardingError(
        MachineError.READ,
        msg,
        Category.POSTGRES,
        log,
        [],
        { entityId: id, statement: 'FIND ONE' }
      );
    }
  }

  public static async isValid(id: ExternalUuid, log: Logger): Promise<boolean> {
    try {
      const entity = await prisma.class.findUnique({
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

  public static async getExternalSchoolIds(
    id: ExternalUuid,
    log: Logger,
    shouldLogNotFoundError = true
  ): Promise<Set<ExternalUuid>> {
    try {
      const schoolIds = await prisma.class.findUnique({
        where: {
          externalUuid: id,
        },
        select: {
          schools: {
            select: {
              externalSchoolUuid: true,
            },
          },
        },
      });
      if (schoolIds === null || schoolIds.schools.length === 0)
        throw ENTITY_NOT_FOUND(
          id,
          this.entity,
          log,
          {},
          shouldLogNotFoundError
        );
      return new Set(
        schoolIds.schools.map(({ externalSchoolUuid }) => externalSchoolUuid)
      );
    } catch (error) {
      const msg = returnMessageOrThrowOnboardingError(error);
      throw POSTGRES_GET_KIDSLOOP_ID_QUERY(id, this.entity, msg, log);
    }
  }

  public static async getKidsloopId(
    id: ExternalUuid,
    log: Logger,
    shouldLogNotFoundError = true
  ): Promise<Uuid> {
    try {
      const klUuid = await prisma.class.findUnique({
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

  public static async areValid(
    ids: ExternalUuid[],
    log: Logger
  ): Promise<{
    valid: ExternalUuid[];
    invalid: ExternalUuid[];
  }> {
    try {
      const validSet = (
        await prisma.class.findMany({
          where: {
            externalUuid: {
              in: ids,
            },
          },
          select: {
            externalUuid: true,
          },
        })
      ).map((c) => c.externalUuid);

      const invalidSet = new Set(ids.map(id => id.toLowerCase()));
      for (const id of validSet) invalidSet.delete(id);
      const invalid = Array.from(invalidSet);
      if (invalid.length > 0) {
        log.warn(
          { invalidClasses: invalid },
          'found invalid classes however filtering them out'
        );
      }

      return {
        valid: validSet,
        invalid,
      };
    } catch (error) {
      const msg = returnMessageOrThrowOnboardingError(error);
      throw new OnboardingError(MachineError.READ, msg, Category.POSTGRES, log);
    }
  }
}
