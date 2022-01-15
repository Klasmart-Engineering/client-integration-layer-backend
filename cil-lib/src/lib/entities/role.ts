import { PrismaClient } from '@prisma/client';
import { Logger } from 'pino';

import {
  Category,
  Errors,
  MachineError,
  OnboardingError,
  POSTGRES_GET_KIDSLOOP_ID_QUERY,
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
        { operation: 'INSERT ONE' }
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
              { operation: 'INSERT MANY' }
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
        { operation: 'FIND ONE' }
      );
    }
  }

  public static async getIdsByNames(
    names: string[],
    orgId: ExternalUuid,
    log: Logger
  ): Promise<{ id: Uuid; name: string }[]> {
    try {
      const klUuids = await prisma.role.findMany({
        where: {
          name: {
            in: names,
          },
          organization: {
            externalUuid: orgId,
          },
        },
        select: {
          klUuid: true,
          name: true,
        },
      });
      if (!klUuids)
        throw POSTGRES_GET_KIDSLOOP_ID_QUERY(
          names,
          this.entity,
          `${this.entity}: ${names.join(
            ', '
          )} not found for organization ${orgId}`,
          log
        );
      const targets = new Set(names);
      for (const { klUuid } of klUuids) {
        targets.delete(klUuid);
      }
      if (targets.size === 0)
        return klUuids.map((id) => ({ id: id.klUuid, name: id.name }));
      throw POSTGRES_GET_KIDSLOOP_ID_QUERY(
        names,
        this.entity,
        `${this.entity}: ${names.join(
          ', '
        )} not found for organization ${orgId}`,
        log
      );
    } catch (error) {
      if (error instanceof OnboardingError) throw error;
      const msg = error instanceof Error ? error.message : `${error}`;
      throw new OnboardingError(
        MachineError.WRITE,
        msg,
        Category.POSTGRES,
        log,
        [],
        { operation: 'FIND MANY' }
      );
    }
  }
}
