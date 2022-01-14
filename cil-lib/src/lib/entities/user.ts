import { User as DbUser, Prisma, PrismaClient } from '@prisma/client';

import { Category, MachineError, OnboardingError } from '../errors';
import { Entity } from '../types';
import { ExternalUuid } from '../utils';

const prisma = new PrismaClient();

export class User {
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

  public static async isValid(id: ExternalUuid): Promise<void> {
    try {
      const count = await prisma.user.count({
        where: {
          externalUuid: id,
        },
      });
      if (count === 1) return;
      throw new Error(`User: ${id} is not valid`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : `${error}`;
      throw new OnboardingError(
        MachineError.READ,
        msg,
        Entity.USER,
        Category.POSTGRES,
        { entityId: id, operation: 'IS VALID' }
      );
    }
  }
}
