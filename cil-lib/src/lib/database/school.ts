import { School as DbSchool, Prisma, PrismaClient } from '@prisma/client';
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
      const msg = returnMessageOrThrowOnboardingError(error);
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
      if (!school) throw ENTITY_NOT_FOUND(id, this.entity, log);
      return school;
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

  public static async getKidsloopId(
    id: ExternalUuid,
    log: Logger
  ): Promise<Uuid> {
    try {
      const school = await prisma.school.findUnique({
        where: {
          externalUuid: id,
        },
        select: {
          klUuid: true,
        },
      });
      if (school) return school.klUuid;
      throw ENTITY_NOT_FOUND(id, this.entity, log);
    } catch (error) {
      const msg = returnMessageOrThrowOnboardingError(error);
      throw POSTGRES_IS_VALID_QUERY(id, this.entity, msg, log);
    }
  }

  public static async getOrgIdForSchool(
    id: ExternalUuid,
    log: Logger
  ): Promise<Uuid> {
    try {
      const klUuid = await prisma.school.findUnique({
        where: {
          externalUuid: id,
        },
        select: {
          klUuid: true,
        },
      });
      if (klUuid && klUuid.klUuid) return klUuid.klUuid;
      throw ENTITY_NOT_FOUND(id, this.entity, log);
    } catch (error) {
      const msg = returnMessageOrThrowOnboardingError(error);
      throw POSTGRES_GET_KIDSLOOP_ID_QUERY(id, this.entity, msg, log);
    }
  }

  public static async getProgramsForSchool(
    id: ExternalUuid,
    log: Logger
  ): Promise<{ id: Uuid; name: string }[]> {
    try {
      const programs = await prisma.programLink.findMany({
        where: {
          externalSchoolUuid: id,
        },
        select: {
          klUuid: true,
          program: {
            select: {
              name: true,
            },
          },
        },
      });
      if (programs.length === 0)
        throw new OnboardingError(
          MachineError.NOT_FOUND,
          `No programs found for school: ${id}`,
          Category.POSTGRES,
          log,
          [],
          { id, operation: 'get programs for school' }
        );
      return programs.map((p) => ({ id: p.klUuid, name: p.program.name }));
    } catch (error) {
      const msg = returnMessageOrThrowOnboardingError(error);
      throw new OnboardingError(
        MachineError.READ,
        msg,
        Category.POSTGRES,
        log,
        [],
        { id, operation: 'get programs for school' }
      );
    }
  }
}
