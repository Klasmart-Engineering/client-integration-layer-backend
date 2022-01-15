import { School as DbSchool, Prisma, PrismaClient } from '@prisma/client';
import { Logger } from 'pino';

import {
  Category,
  MachineError,
  OnboardingError,
  POSTGRES_GET_KIDSLOOP_ID_QUERY,
  POSTGRES_IS_VALID_QUERY,
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
      const msg = error instanceof Error ? error.message : `${error}`;
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
      if (!school) throw new Error(`School: ${id} not found`);
      return school;
    } catch (error) {
      const msg = error instanceof Error ? error.message : `${error}`;
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
      const school = await prisma.school.findFirst({
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
      const klUuid = await prisma.school.findUnique({
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
}
