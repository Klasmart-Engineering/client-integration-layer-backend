import { Class as DbClass, Prisma, PrismaClient } from '@prisma/client';

import { Category, MachineError, OnboardingError } from '../errors';
import { Entity } from '../types';
import { ExternalUuid } from '../utils';

const prisma = new PrismaClient();

export class Class {
  public static async insertOne(c: Prisma.ClassCreateInput): Promise<void> {
    try {
      await prisma.class.create({
        data: c,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : `${error}`;
      throw new OnboardingError(
        MachineError.WRITE,
        msg,
        Entity.CLASS,
        Category.POSTGRES,
        { entityId: c.externalUuid, operation: 'INSERT ONE' }
      );
    }
  }

  public static async findOne(id: ExternalUuid): Promise<DbClass> {
    try {
      const c = await prisma.class.findUnique({
        where: {
          externalUuid: id,
        },
      });
      if (!c) throw new Error(`Class: ${id} not found`);
      return c;
    } catch (error) {
      const msg = error instanceof Error ? error.message : `${error}`;
      throw new OnboardingError(
        MachineError.READ,
        msg,
        Entity.CLASS,
        Category.POSTGRES,
        { entityId: id, operation: 'FIND ONE' }
      );
    }
  }

  public static async isValid(id: ExternalUuid): Promise<void> {
    try {
      const count = await prisma.class.count({
        where: {
          externalUuid: id,
        },
      });
      if (count === 1) return;
      throw new Error(`Class: ${id} is not valid`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : `${error}`;
      throw new OnboardingError(
        MachineError.READ,
        msg,
        Entity.CLASS,
        Category.POSTGRES,
        { entityId: id, operation: 'IS VALID' }
      );
    }
  }

  public static async areValid(
    schoolId: ExternalUuid,
    ids: ExternalUuid[]
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
        MachineError.READ,
        msg,
        Entity.CLASS,
        Category.POSTGRES,
        { entityIds: ids, operation: 'ARE VALID' }
      );
    }
  }
}
