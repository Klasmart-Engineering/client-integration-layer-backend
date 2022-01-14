import { PrismaClient } from '@prisma/client';

import { Category, Errors, MachineError, OnboardingError } from '../errors';
import { IdNameMapper } from '../services/adminService';
import { Entity } from '../types';
import { ExternalUuid, Uuid } from '../utils';

const prisma = new PrismaClient();

export class Program {
  public static async insertOne(
    name: string,
    klUuid: Uuid,
    externalOrgId: ExternalUuid
  ): Promise<void> {
    try {
      await prisma.program.create({
        data: {
          name,
          klUuid,
          organization: {
            connect: {
              externalUuid: externalOrgId,
            },
          },
        },
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : `${error}`;
      throw new OnboardingError(
        MachineError.WRITE,
        msg,
        Entity.PROGRAM,
        Category.POSTGRES,
        { entityId: klUuid, operation: 'INSERT ONE' }
      );
    }
  }

  public static async insertMany(
    programs: IdNameMapper[],
    externalOrgId: ExternalUuid
  ): Promise<void> {
    const errors = [];
    for (const { name, id } of programs) {
      try {
        await Program.insertOne(name, id, externalOrgId);
      } catch (error) {
        if (error instanceof OnboardingError) {
          errors.push(error);
        } else {
          const msg = error instanceof Error ? error.message : `${error}`;
          errors.push(
            new OnboardingError(
              MachineError.WRITE,
              msg,
              Entity.PROGRAM,
              Category.POSTGRES,
              { entityId: id, operation: 'INSERT MANY' }
            )
          );
        }
      }
    }
    if (errors.length > 0) throw new Errors(errors);
  }
}
