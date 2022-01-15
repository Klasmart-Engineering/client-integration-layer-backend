import LRU from 'lru-cache';
import { Logger } from 'pino';

import { Class, Organization, Program, Role, School, User } from '../entities';
import {
  Category,
  INVALID_ENTITY,
  MachineError,
  OnboardingError,
} from '../errors';
import { IdNameMapper } from '../services/adminService';
import { Entity } from '../types';

import { ExternalUuid, Uuid } from '.';

export class Context {
  private static _instance: Context;

  private invalidOrganizations = new LRU<ExternalUuid, null>({
    max: 100,
    maxAge: 60 * 1000 * 5,
    updateAgeOnGet: true,
  });

  private organizations = new LRU<ExternalUuid, Uuid>({
    max: 50,
    maxAge: 60 * 1000,
    updateAgeOnGet: true,
  });

  private schools = new LRU<ExternalUuid, null>({
    max: 50,
    maxAge: 60 * 1000,
    updateAgeOnGet: true,
  });

  private classes = new LRU<ExternalUuid, null>({
    max: 50,
    maxAge: 60 * 1000,
    updateAgeOnGet: true,
  });

  private users = new LRU<ExternalUuid, null>({
    max: 100,
    maxAge: 60 * 1000,
    updateAgeOnGet: true,
  });

  private roles = new LRU<ExternalUuid, Map<string, Uuid>>({
    max: 10,
    maxAge: 60 * 1000,
    updateAgeOnGet: true,
  });

  private programs = new LRU<ExternalUuid, Map<string, Uuid>>({
    max: 10,
    maxAge: 60 * 1000,
    updateAgeOnGet: true,
  });

  private constructor() {
    // Handled in Context.getInstance();
  }

  public static getInstance(): Context {
    if (this._instance) return this._instance;
    this._instance = new Context();
    return this._instance;
  }

  /**
   * @param {ExternalUuid} id - The external uuid of the organization
   * @returns {Uuid} the KidsLoop uuid for the organization
   * @errors if the id does not correspond to an organization in our system
   */
  public async organizationIdIsValid(
    id: ExternalUuid,
    log: Logger
  ): Promise<Uuid> {
    if (this.invalidOrganizations.has(id))
      throw INVALID_ENTITY(id, Entity.ORGANIZATION, log);
    {
      const klId = this.organizations.get(id);
      if (klId) return klId;
    }

    // Will error
    try {
      const klId = await Organization.getId(id, log);
      this.organizations.set(id, klId);
      return klId;
    } catch (e) {
      this.invalidOrganizations.set(id, null);
      throw e;
    }
  }

  /**
   * @param {ExternalUuid} id - The external uuid of the school
   * @errors if the id does not correspond to a school in our system
   */
  public async schoolIdIsValid(id: ExternalUuid, log: Logger): Promise<void> {
    {
      const klId = this.schools.get(id);
      if (klId) return klId;
    }

    // Will error
    await School.isValid(id, log);
    this.schools.set(id, null);
  }

  /**
   * @param {ExternalUuid} id - The external uuid of the class
   * @errors if the id does not correspond to a class in our system
   */
  public async classIdIsValid(id: ExternalUuid, log: Logger): Promise<void> {
    {
      const klId = this.classes.get(id);
      if (klId) return klId;
    }

    // Will error
    await Class.isValid(id, log);
    this.classes.set(id, null);
  }

  /**
   * @param {ExternalUuid} id - The external uuid of the user
   * @errors if the id does not correspond to a school in our system
   */
  public async userIdIsValid(id: ExternalUuid, log: Logger): Promise<void> {
    {
      const klId = this.schools.get(id);
      if (klId) return klId;
    }

    // Will error
    await User.isValid(id, log);
    this.users.set(id, null);
  }

  /**
   * @param {string[]} programs - The program names to be validated
   * @param {string} orgId - The client UUID for the organization
   * @errors if any of the programs are invalid
   */
  public async programsAreValid(
    programs: string[],
    orgId: ExternalUuid,
    log: Logger
  ): Promise<IdNameMapper[]> {
    const p = this.programs.get(orgId);
    if (!p) {
      const ids = await Program.getIdsByNames(programs, orgId, log);
      const map = new Map();
      for (const { id, name } of ids) {
        map.set(name, id);
      }
      this.programs.set(orgId, map);
      return ids;
    }
    const validNames = [];
    const invalidNames = [];
    for (const program of programs) {
      const id = p.get(program);
      if (id) {
        validNames.push({ id, name: program });
        continue;
      }
      invalidNames.push(program);
    }
    if (invalidNames.length === 0) return validNames;
    throw new OnboardingError(
      MachineError.VALIDATION,
      `Programs: ${invalidNames.join(', ')} are invalid`,
      Category.REQUEST,
      log
    );
  }

  /**
   * @param {string[]} roles - The role names to be validated
   * @param {string} orgId - The client UUID for the organization
   * @errors if any of the programs are invalid
   */
  public async rolesAreValid(
    roles: string[],
    orgId: ExternalUuid,
    log: Logger
  ): Promise<IdNameMapper[]> {
    const r = this.roles.get(orgId);
    if (!r) {
      const ids = await Role.getIdsByNames(roles, orgId, log);
      const map = new Map();
      for (const { id, name } of ids) {
        map.set(name, id);
      }
      this.roles.set(orgId, map);
      return ids;
    }
    const validNames = [];
    const invalidNames = [];
    for (const role of roles) {
      const id = r.get(role);
      if (id) {
        validNames.push({ id, name: role });
        continue;
      }
      invalidNames.push(role);
    }
    if (invalidNames.length === 0) return validNames;
    throw new OnboardingError(
      MachineError.VALIDATION,
      `Roles: ${invalidNames.join(', ')} are invalid`,
      Category.REQUEST,
      log
    );
  }
}
