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
    c: Prisma.ClassCreateInput,
    log: Logger
  ): Promise<void> {
    try {
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
        { entityId: c.externalUuid, operation: 'INSERT ONE' }
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
        { entityId: id, operation: 'FIND ONE' }
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
    schoolId: ExternalUuid,
    ids: ExternalUuid[],
    log: Logger
  ): Promise<void> {
    try {
      const count = (
        await prisma.class.findMany({
          where: {
            externalUuid: {
              in: ids,
            },
            externalSchoolUuid: schoolId,
          },
          select: {
            externalUuid: true,
          },
        })
      ).map((c) => c.externalUuid);
      if (count.length === ids.length) return;
      const idSet = new Set(ids);
      for (const id of count) {
        idSet.delete(id);
      }
      throw new Error(
        `Classes: ${[Array.from(idSet).join(', ')]} are not valid`
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : `${error}`;
      throw new OnboardingError(
        MachineError.ENTITY_DOES_NOT_EXIST,
        msg,
        Category.REQUEST,
        log,
        [],
        { entityIds: ids, operation: 'ARE VALID' }
      );
    }
  }
}
