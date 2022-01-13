import { School as DbSchool, Prisma, PrismaClient } from '@prisma/client';

import { Category, MachineError, OnboardingError } from '../errors';
import { Entity } from '../types';
import { ClientUuid } from '../utils';

const prisma = new PrismaClient();

export class School {
  public static async insertOne(
    school: Prisma.SchoolCreateInput
  ): Promise<void> {
    try {
      await prisma.school.create({
        data: school,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : `${error}`;
      throw new OnboardingError(
        MachineError.WRITE,
        msg,
        Entity.SCHOOL,
        Category.POSTGRES,
        { entityId: school.clientUuid, operation: 'INSERT ONE' }
      );
    }
  }

  public static async findOne(id: ClientUuid): Promise<DbSchool> {
    try {
      const school = await prisma.school.findUnique({
        where: {
          clientUuid: id,
        },
      });
      if (!school) throw new Error(`School: ${id} not found`);
      return school;
    } catch (error) {
      const msg = error instanceof Error ? error.message : `${error}`;
      throw new OnboardingError(
        MachineError.READ,
        msg,
        Entity.SCHOOL,
        Category.POSTGRES,
        { entityId: id, operation: 'FIND ONE' }
      );
    }
  }

  public static async isValid(id: ClientUuid): Promise<void> {
    try {
      const count = await prisma.school.count({
        where: {
          clientUuid: id,
        },
      });
      if (count === 1) return;
      throw new Error(`School: ${id} is not valid`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : `${error}`;
      throw new OnboardingError(
        MachineError.VALIDATION,
        msg,
        Entity.SCHOOL,
        Category.POSTGRES,
        { entityId: id, operation: 'IS VALID' }
      );
    }
  }

  public static async getPrograms(id: ClientUuid): Promise<string[]> {
    try {
      const programs = await prisma.school.findUnique({
        where: {
          clientUuid: id,
        },
        select: {
          programUuids: true,
        },
      });
      if (!programs) throw new Error(`School: ${id} not found`);
      return programs.programUuids;
    } catch (error) {
      const msg = error instanceof Error ? error.message : `${error}`;
      throw new OnboardingError(
        MachineError.READ,
        msg,
        Entity.SCHOOL,
        Category.POSTGRES,
        { entityId: id, operation: 'GET PROGRAMS' }
      );
    }
  }

  public static async programsAreValid(
    schoolId: ClientUuid,
    programs: ClientUuid[]
  ): Promise<void> {
    const validPrograms = new Set(await School.getPrograms(schoolId));
    const invalidPrograms = [];
    for (const program of programs) {
      if (!validPrograms.has(program)) invalidPrograms.push(program);
    }
    if (invalidPrograms.length > 0)
      throw new OnboardingError(
        MachineError.VALIDATION,
        `Programs: ${invalidPrograms.join(
          ', '
        )} are invalid when comparing to the parent School ${schoolId}`,
        Entity.PROGRAM,
        Category.REQUEST,
        { entityIds: programs, operation: 'PROGRAMS ARE VALID' }
      );
  }
}
