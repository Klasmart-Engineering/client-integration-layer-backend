import { PrismaClient } from '@prisma/client';
import { Logger } from 'pino';

import {
  Category,
  ENTITY_NOT_FOUND,
  Errors,
  MachineError,
  OnboardingError,
  POSTGRES_GET_KIDSLOOP_ID_QUERY,
} from '../errors';
import { IdNameMapper } from '../services/adminService';
import { Entity } from '../types';
import { ExternalUuid, Uuid } from '../utils';

const prisma = new PrismaClient();

export class Program {
  public static entity = Entity.PROGRAM;

  public static async insertOne(
    name: string,
    klUuid: Uuid,
    externalOrgId: ExternalUuid,
    log: Logger
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
        await Program.insertOne(name, id, externalOrgId, log);
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
      const klUuid = await prisma.program.findFirst({
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
          `Program: ${name} not found for organization ${orgId}`,
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
    programNames: string[],
    orgId: ExternalUuid,
    log: Logger
  ): Promise<IdNameMapper[]> {
    try {
      const klUuids = await prisma.program.findMany({
        where: {
          name: {
            in: programNames,
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
          programNames,
          this.entity,
          `Programs: ${programNames.join(
            ', '
          )} not found for organization ${orgId}`,
          log
        );
      const targets = new Set(programNames);
      for (const { klUuid } of klUuids) {
        targets.delete(klUuid);
      }
      if (targets.size === 0)
        return klUuids.map((id) => ({ id: id.klUuid, name: id.name }));
      throw POSTGRES_GET_KIDSLOOP_ID_QUERY(
        programNames,
        this.entity,
        `Programs: ${programNames.join(
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

  public static async getIdsByNamesForClass(
    programNames: string[],
    orgId: ExternalUuid,
    schoolId: ExternalUuid,
    log: Logger
  ): Promise<IdNameMapper[]> {
    try {
      const klUuids = await prisma.program.findMany({
        where: {
          name: {
            in: programNames,
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
      const schoolsPrograms = await prisma.school.findUnique({
        where: {
          externalUuid: schoolId,
        },
        select: {
          programUuids: true,
        },
      });
      if (!schoolsPrograms)
        throw ENTITY_NOT_FOUND(schoolId, Entity.SCHOOL, log);
      if (!klUuids)
        throw POSTGRES_GET_KIDSLOOP_ID_QUERY(
          programNames,
          this.entity,
          `Programs: ${programNames.join(
            ', '
          )} not found for organization ${orgId}`,
          log
        );
      const validForSchool = new Set(schoolsPrograms.programUuids);
      const targets = new Set(programNames);
      for (const { klUuid } of klUuids) {
        // If the school also has the program, then add it
        if (validForSchool.has(klUuid)) targets.delete(klUuid);
        // Otherwise that program hasn't been added to that school yet
        // so it is treated as invalid
      }
      if (targets.size === 0)
        return klUuids.map((id) => ({ id: id.klUuid, name: id.name }));
      throw POSTGRES_GET_KIDSLOOP_ID_QUERY(
        programNames,
        this.entity,
        `Programs: ${programNames.join(
          ', '
        )} not found for organization ${orgId},
        school: ${schoolId}`,
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
