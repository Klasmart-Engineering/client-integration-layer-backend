import LRU from 'lru-cache';
import { Logger } from 'pino';

import { Class, Organization, School, User } from '../entities';
import { INVALID_ENTITY } from '../errors';
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
   * @param {string[]} roles - The role names to be validated
   * @param {string} orgId - The client UUID for the organization
   * @errors If any of the roles are invalid
   */
  // public async rolesAreValid(
  //   roles: string[],
  //   orgId: ClientUuid
  // ): Promise<void> {
  //   await this.roles.rolesAreValid(roles, orgId);
  // }

  /**
   * @param {string[]} programs - The program names to be validated
   * @param {string} orgId - The client UUID for the organization
   * @param {string?} schoolId - The client UUID of the school (optional)
   * @param {string?} classId - The client UUID of the class (optional)
   * @errors If any of the programs are invalid
   */
  // public async programsAreValid(
  //   programs: string[],
  //   orgId: ClientUuid,
  //   schoolId: ClientUuid,
  //   classId?: ClientUuid
  // ): Promise<void> {
  //   await this.programs.programsAreValid(programs, orgId, schoolId, classId);
  // }

  /**
   * @param {ClientUuid[]} classIds - The class ids to be validated
   * @param {ClientUuid} orgId - The organization id for the classes in question
   * @param {ClientUuid} schoolId - The school id for the classes in question
   * @errors If any of the classes are invalid
   */
  // public async classesAreValid(
  //   classIds: ClientUuid[],
  //   orgId: ClientUuid,
  //   schoolId: ClientUuid
  // ): Promise<void> {
  //   try {
  //     for (const id of classIds) {
  //       if (!this.classes.has(id)) throw Error('Class not found in cache');
  //     }
  //     return; // All classes are valid
  //   } catch (_) {
  //     await Database.classIdsAreValid(orgId, schoolId, classIds);
  //     // If the above hasn't errorred then all the ids are valid
  //     for (const id of classIds) {
  //       this.classes.set(id, null);
  //     }
  //   }
  // }
}
