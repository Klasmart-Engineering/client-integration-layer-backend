import { PrismaClient } from '@prisma/client';
import { Logger } from 'pino';

import {
  Category,
  Errors,
  MachineError,
  OnboardingError,
  POSTGRES_GET_KIDSLOOP_ID_QUERY,
  returnMessageOrThrowOnboardingError,
} from '../errors';
import { IdNameMapper } from '../services/adminService';
import { Entity } from '../types';
import { ExternalUuid, Uuid } from '../utils';

const prisma = new PrismaClient();

export class Role {
  public static entity = Entity.ROLE;

  public static async insertOne(
    name: string,
    klUuid: Uuid,
    externalOrgId: ExternalUuid,
    log: Logger
  ): Promise<void> {
    try {
      await prisma.role.create({
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
      if (error instanceof OnboardingError) throw error;
      const msg = error instanceof Error ? error.message : `${error}`;
      throw new OnboardingError(
        MachineError.WRITE,
        msg,
        Category.POSTGRES,
        log,
        [],
        { queryType: 'INSERT ONE' }
      );
    }
  }

  public static async insertMany(
    programs: IdNameMapper[],
    externalOrgId: ExternalUuid,
    log: Logger
  ): Promise<void> {
    const errors = [];
    for (const { name, id } of programs) {
      try {
        const alreadyExists = await prisma.role.findUnique({
          where: {
            klUuid: id,
          },
          select: {
            klUuid: true,
          },
        });
        if (alreadyExists && alreadyExists.klUuid) return;
        await Role.insertOne(name, id, externalOrgId, log);
      } catch (error) {
        if (error instanceof OnboardingError) {
          errors.push(error);
        } else {
          const msg = error instanceof Error ? error.message : `${error}`;
          errors.push(
            new OnboardingError(
              MachineError.WRITE,
              msg,
              Category.POSTGRES,
              log,
              [],
              { queryType: 'INSERT MANY' }
            )
          );
        }
      }
    }
    if (errors.length > 0) throw new Errors(errors);
  }

  public static async getIdByName(
    name: string,
    orgId: ExternalUuid,
    log: Logger
  ): Promise<Uuid> {
    try {
      const klUuid = await prisma.role.findFirst({
        where: {
          name,
          organization: {
            externalUuid: orgId,
          },
        },
        select: {
          klUuid: true,
        },
      });
      if (!klUuid)
        throw POSTGRES_GET_KIDSLOOP_ID_QUERY(
          name,
          this.entity,
          `${this.entity}: ${name} not found for organization ${orgId}`,
          log
        );
      return klUuid.klUuid;
    } catch (error) {
      if (error instanceof OnboardingError) throw error;
      const msg = error instanceof Error ? error.message : `${error}`;
      throw new OnboardingError(
        MachineError.WRITE,
        msg,
        Category.POSTGRES,
        log,
        [],
        { queryType: 'FIND ONE' }
      );
    }
  }

  public static async getIdsForOrganization(
    orgId: ExternalUuid,
    log: Logger
  ): Promise<Map<string, Uuid>> {
    try {
      const results = await prisma.role.findMany({
        where: {
          organization: {
            externalUuid: orgId,
          },
        },
        select: {
          klUuid: true,
          name: true,
        },
      });
      const m = new Map();
      for (const { klUuid, name } of results) m.set(name, klUuid);
      return m;
    } catch (error) {
      const msg = returnMessageOrThrowOnboardingError(error);
      throw new OnboardingError(
        MachineError.WRITE,
        msg,
        Category.POSTGRES,
        log,
        [],
        { queryType: 'find roles for organization' }
      );
    }
  }
}
