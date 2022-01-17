import { School as DbSchool, Prisma, PrismaClient } from '@prisma/client';
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

export class School {
  public static entity = Entity.SCHOOL;

  public static async insertOne(
    school: Prisma.SchoolCreateInput,
    log: Logger
  ): Promise<void> {
    try {
      await prisma.school.create({
        data: school,
      });
    } catch (error) {
      const msg = returnMessageOrThrowOnboardingError(error);
      throw new OnboardingError(
        MachineError.WRITE,
        msg,
        Category.POSTGRES,
        log,
        [],
        { entityId: school.externalUuid, operation: 'INSERT ONE' }
      );
    }
  }

  public static async findOne(
    id: ExternalUuid,
    log: Logger
  ): Promise<DbSchool> {
    try {
      const school = await prisma.school.findUnique({
        where: {
          externalUuid: id,
        },
      });
      if (!school) throw ENTITY_NOT_FOUND(id, this.entity, log);
      return school;
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
      const school = await prisma.school.findUnique({
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

  public static async getId(id: ExternalUuid, log: Logger): Promise<Uuid> {
    try {
      const klUuid = await prisma.school.findUnique({
        where: {
          externalUuid: id,
        },
        select: {
          klUuid: true,
        },
      });
      if (klUuid && klUuid.klUuid) return klUuid.klUuid;
      throw ENTITY_NOT_FOUND(id, this.entity, log);
    } catch (error) {
      const msg = returnMessageOrThrowOnboardingError(error);
      throw POSTGRES_GET_KIDSLOOP_ID_QUERY(id, this.entity, msg, log);
    }
  }
}
