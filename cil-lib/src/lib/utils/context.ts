import LRU from 'lru-cache';
import { Logger } from 'pino';

import { Class, Organization, Program, Role, School, User } from '../database';
import {
  Category,
  ENTITY_ALREADY_EXISTS,
  MachineError,
  OnboardingError,
} from '../errors';
import { AdminService, IdNameMapper } from '../services/adminService';
import { Entity as AppEntity } from '../types';

import { ExternalUuid, log, Uuid } from '.';
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

  private systemRoles = new Map<string, Uuid>();
  private systemPrograms = new Map<string, Uuid>();

  private constructor() {
    // Handled in await Context.getInstance();
  }

  public static async getInstance(
    fetchSystemData = false,
    logger: Logger = log
  ): Promise<Context> {
    if (fetchSystemData) {
      log.info(`Attempting to fetch system roles and programs`);
      const ctx = this._instance ? this._instance : new Context();
      const admin = await AdminService.getInstance();
      const roles = await admin.getSystemRoles(logger);
      log.info(`Fetched ${roles.length} system roles`);
      const programs = await admin.getSystemPrograms(logger);
      log.info(`Fetched ${programs.length} system programs`);
      for (const { id, name } of roles) ctx.systemRoles.set(name, id);
      for (const { id, name } of programs) ctx.systemPrograms.set(name, id);
      this._instance = ctx;
    }
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
    log: Logger,
    shouldLogNotFoundError = true
  ): Promise<void> {
    {
      const cachedKlId = this.organizations.get(id);
      if (cachedKlId) return;
    }

    // Will error
    const klId = await Organization.getKidsloopId(
      id,
      log,
      shouldLogNotFoundError
    );
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
  public async userDoesNotExist(
    id: ExternalUuid,
    log: Logger,
    shouldLogNotFoundError = false
  ): Promise<void> {
    {
      const cachedKlId = this.users.get(id);
      if (cachedKlId) throw ENTITY_ALREADY_EXISTS(id, AppEntity.USER, log);
    }
    try {
      const klId = await User.getKidsloopId(id, log, shouldLogNotFoundError);

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

  public async getClassIds(
    ids: ExternalUuid[],
    log: Logger
  ): Promise<{ valid: Map<ExternalUuid, Uuid>; invalid: ExternalUuid[] }> {
    const targets = new Set(ids);
    const validResult = new Map();
    // Check the cache
    for (const id of ids) {
      const kidsloopUuid = this.classes.get(id);
      if (kidsloopUuid) {
        targets.delete(id);
        validResult.set(id, kidsloopUuid);
      }
    }

    if (targets.size === 0) return { valid: validResult, invalid: [] };

    const { valid, invalid } = await Class.areValid(Array.from(targets), log);

    // Any valid entries we can add to the cache
    for (const { externalUuid, klUuid } of valid) {
      this.classes.set(externalUuid, klUuid);
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
    log: Logger,
    orgId?: ExternalUuid,
    schoolId?: ExternalUuid
  ): Promise<IdNameMapper[]> {
    const { valid, invalid } = await this.getProgramNames(
      programs,
      log,
      orgId,
      schoolId
    );

    if (invalid.length === 0) return valid;
    throw new OnboardingError(
      MachineError.VALIDATION,
      `Programs: ${invalid.join(', ')} are invalid`,
      Category.REQUEST,
      log
    );
  }
  //@TODO - Implement some form of caching on this
  public async getProgramNames(
    programs: string[],
    log: Logger,
    orgId?: ExternalUuid,
    schoolId?: ExternalUuid
  ): Promise<{ valid: IdNameMapper[]; invalid: ExternalUuid[] }> {
    if (!schoolId && !orgId)
      throw new OnboardingError(
        MachineError.APP_CONFIG,
        'if no school id is provided, a valid org id must be provided',
        Category.APP,
        log
      );

    let entitySpecificPrograms = new Map<string, Uuid>();
    if (schoolId) {
      entitySpecificPrograms = await Program.getSchoolPrograms(schoolId, log);
    } else if (orgId) {
      if (!this.programs.has(orgId)) {
        const orgPrograms = await Program.getForOrg(orgId, log);
        this.programs.set(orgId, orgPrograms);
        entitySpecificPrograms = orgPrograms;
      }
      entitySpecificPrograms = this.programs.get(orgId) || new Map();
    }

    const validNames = [];
    const invalidNames = [];
    for (const program of programs) {
      const systemProgram = this.systemPrograms.get(program);
      if (systemProgram) {
        validNames.push({ id: systemProgram, name: program });
        continue;
      }
      const orgProgram = entitySpecificPrograms.get(program);
      if (orgProgram) {
        validNames.push({ id: orgProgram, name: program });
        continue;
      }
      invalidNames.push(program);
    }
    return { valid: validNames, invalid: invalidNames };
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
      this.roles.set(orgId, ids);
    }
    const orgRoles = this.roles.get(orgId) || new Map();
    const validNames = [];
    const invalidNames = [];
    for (const role of roles) {
      const systemRole = this.systemRoles.get(role);
      if (systemRole) {
        validNames.push({ id: systemRole, name: role });
        continue;
      }
      const orgRole = orgRoles.get(role);
      if (orgRole) {
        validNames.push({ id: orgRole, name: role });
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

  public async reset() {
    this.classes.reset();
    this.organizations.reset();
    this.schools.reset();
    this.classes.reset();
    this.users.reset();
    this.roles.reset();
    this.programs.reset();
  }
}
