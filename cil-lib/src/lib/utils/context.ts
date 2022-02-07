import LRU from 'lru-cache';
import { Logger } from 'pino';

import { Class, Organization, Program, Role, School, User } from '../database';
import {
  Category,
  ENTITY_ALREADY_EXISTS,
  ENTITY_NOT_FOUND_FOR,
  MachineError,
  OnboardingError,
} from '../errors';
import { IdNameMapper } from '../services/adminService';
import { Entity as AppEntity, Entity } from '../types';

import { ExternalUuid, Uuid } from '.';
export class Context {
  private static _instance: Context;

  private organizations = new LRU<ExternalUuid, Uuid>({
    max: 25,
    maxAge: 60 * 1000,
    updateAgeOnGet: true,
  });

  private schools = new LRU<ExternalUuid, Uuid>({
    max: 50,
    maxAge: 60 * 1000,
    updateAgeOnGet: true,
  });

  private classes = new LRU<ExternalUuid, Uuid>({
    max: 75,
    maxAge: 60 * 1000,
    updateAgeOnGet: true,
  });

  private users = new LRU<ExternalUuid, Uuid>({
    max: 250,
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
  ): Promise<void> {
    {
      const cachedKlId = this.organizations.get(id);
      if (cachedKlId) return;
    }

    // Will error
    const klId = await Organization.getKidsloopId(id, log);
    this.organizations.set(id, klId);
    return;
  }

  /**
   * @param {ExternalUuid} id - The external uuid of the organization
   * @returns {Uuid} the KidsLoop uuid for the organization
   * @errors if the id does not correspond to an organization in our system
   */
  public async getOrganizationId(
    id: ExternalUuid,
    log: Logger,
    shouldLogNotFoundError = true
  ): Promise<Uuid> {
    {
      const cachedKlId = this.organizations.get(id);
      if (cachedKlId) return cachedKlId;
    }

    // Will error
    const klId = await Organization.getKidsloopId(
      id,
      log,
      shouldLogNotFoundError
    );
    this.organizations.set(id, klId);
    return klId;
  }

  /**
   * @param {ExternalUuid} id - The external uuid of the school
   * @errors if the id does not correspond to a school in our system
   */
  public async getSchoolId(
    id: ExternalUuid,
    log: Logger,
    shouldLogNotFoundError = true
  ): Promise<Uuid> {
    {
      const klId = this.schools.get(id);
      if (klId) return klId;
    }

    // Will error
    const klUuid = await School.getKidsloopId(id, log, shouldLogNotFoundError);
    this.schools.set(id, klUuid);
    return klUuid;
  }

  /**
   * @param {ExternalUuid} id - The external uuid of the class
   * @errors if the id does not correspond to a class in our system
   */
  public async getClassId(
    id: ExternalUuid,
    log: Logger,
    shouldLogNotFoundError = true
  ): Promise<Uuid> {
    {
      const klId = this.classes.get(id);
      if (klId) return klId;
    }

    // Will error
    const klUuid = await Class.getKidsloopId(id, log, shouldLogNotFoundError);
    this.classes.set(id, klUuid);
    return klUuid;
  }

  public async getUserId(
    id: ExternalUuid,
    log: Logger,
    shouldLogNotFoundError = true
  ): Promise<Uuid> {
    {
      const klId = this.users.get(id);
      if (klId) return klId;
    }

    // Will error
    const klUuid = await User.getKidsloopId(id, log, shouldLogNotFoundError);
    this.users.set(id, klUuid);
    return klUuid;
  }

  /**
   * @param {ExternalUuid} id - The external uuid of the user
   * @errors if there's a database error or entity already exists
   */
  public async userDoesNotExist(id: ExternalUuid, log: Logger): Promise<void> {
    {
      const cachedKlId = this.users.get(id);
      if (cachedKlId) throw ENTITY_ALREADY_EXISTS(id, AppEntity.USER, log);
    }
    try {
      const klId = await User.getKidsloopId(id, log);

      if (klId) {
        this.users.set(id, klId);
        throw ENTITY_ALREADY_EXISTS(id, AppEntity.USER, log);
      }
    } catch (error) {
      if (
        error instanceof OnboardingError &&
        error.error === MachineError.ENTITY_DOES_NOT_EXIST
      ) {
        return;
      }
      throw error;
    }
  }

  public async getUserIds(
    ids: ExternalUuid[],
    log: Logger
  ): Promise<{ valid: Map<ExternalUuid, Uuid>; invalid: ExternalUuid[] }> {
    const targets = new Set(ids);
    const validResult = new Map();
    // Check the cache
    for (const id of ids) {
      const kidsloopUuid = this.users.get(id);
      if (kidsloopUuid) {
        targets.delete(id);
        validResult.set(id, kidsloopUuid);
      }
    }
    const { valid, invalid } = await User.areValid(Array.from(targets), log);
    // Any valid entries we can add to the cache
    for (const { externalUuid, klUuid } of valid) {
      this.users.set(externalUuid, klUuid);
      validResult.set(externalUuid, klUuid);
    }
    return { valid: validResult, invalid };
  }

  /**
   * @param {string[]} programs - The program names to be validated
   * @param {string} orgId - The client UUID for the organization
   * @errors if any of the programs are invalid
   */
  public async programsAreValid(
    programs: string[],
    orgId: ExternalUuid,
    log: Logger,
    schoolId?: ExternalUuid
  ): Promise<IdNameMapper[]> {
    // @TODO - Implement some form of caching on this
    if (schoolId)
      return await Program.getIdsByNamesForClass(programs, schoolId, log);
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
   * @errors if any of the roles are invalid
   */
  public async rolesAreValid(
    roles: string[],
    orgId: ExternalUuid,
    log: Logger
  ): Promise<IdNameMapper[]> {
    if (!this.roles.has(orgId)) {
      const ids = await Role.getIdsForOrganization(orgId, log);
      const map = new Map();
      for (const { id, name } of ids) {
        map.set(name, id);
      }
      this.roles.set(orgId, map);
    }
    const r = this.roles.get(orgId);
    if (!r)
      throw ENTITY_NOT_FOUND_FOR(
        roles.join(', '),
        Entity.ROLE,
        orgId,
        Entity.ORGANIZATION,
        log
      );
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
      `Roles: ${invalidNames.join(
        ', '
      )} are invalid for organization: ${orgId}`,
      Category.REQUEST,
      log
    );
  }
}
