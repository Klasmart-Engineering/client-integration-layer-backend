import { User as DbUser, Prisma, PrismaClient } from '@prisma/client';

import { Category, MachineError, OnboardingError } from '../errors';
import { Entity } from '../types';
import { ClientUuid } from '../utils';

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
        { entityId: user.clientUuid, operation: 'INSERT ONE' }
      );
    }
  }

  public static async findOne(id: ClientUuid): Promise<DbUser> {
    try {
      const user = await prisma.user.findUnique({
        where: {
          clientUuid: id,
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

  public static async isValid(id: ClientUuid): Promise<void> {
    try {
      const count = await prisma.user.count({
        where: {
          clientUuid: id,
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
