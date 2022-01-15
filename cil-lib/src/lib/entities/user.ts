import { User as DbUser, Prisma, PrismaClient } from '@prisma/client';
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

export class User {
  public static entity = Entity.USER;
  public static async insertOne(user: Prisma.UserCreateInput): Promise<void> {
    try {
      await prisma.user.create({
        data: user,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : `${error}`;
      throw new OnboardingError(
        MachineError.WRITE,
        msg,
        Entity.USER,
        Category.POSTGRES,
        { entityId: user.externalUuid, operation: 'INSERT ONE' }
      );
    }
  }

  public static async findOne(id: ExternalUuid): Promise<DbUser> {
    try {
      const user = await prisma.user.findUnique({
        where: {
          externalUuid: id,
        },
      });
      if (!user) throw new Error(`User: ${id} not found`);
      return user;
    } catch (error) {
      const msg = error instanceof Error ? error.message : `${error}`;
      throw new OnboardingError(
        MachineError.READ,
        msg,
        Entity.USER,
        Category.POSTGRES,
        { entityId: id, operation: 'FIND ONE' }
      );
    }
  }

  public static async isValid(id: ExternalUuid, log: Logger): Promise<boolean> {
    try {
      const entity = await prisma.user.findFirst({
        where: {
          externalUuid: id,
        },
        select: {
          externalUuid: true,
        },
      });
      if (entity) return true;
      throw new Error(`${this.entity}: ${id} is not valid`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : `${error}`;
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
      throw new Error(`Unable to find KidsLoop ID for ${this.entity}: ${id}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : `${error}`;
      throw POSTGRES_GET_KIDSLOOP_ID_QUERY(id, this.entity, msg, log);
    }
  }
}
