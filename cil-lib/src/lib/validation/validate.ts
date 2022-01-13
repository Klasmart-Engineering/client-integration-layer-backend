import { ObjectSchema } from 'joi';

import { log } from '../..';
import { Class, Organization, School } from '../entities';
import {
  Category,
  Errors,
  MachineError,
  OnboardingError,
  UNREACHABLE,
} from '../errors';
import { OnboardingRequest } from '../protos/api_pb';
import { Entity } from '../types';

import { classSchema, organizationSchema, schoolSchema, userSchema } from '.';

export interface Validate {
  data: OnboardingRequest;

  validate(): Promise<OnboardingRequest>;
  getEntityId(): string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getSchema(): ObjectSchema<any>;

  getOrganizationId(): string | null;
  getSchoolId(): string | null;
  getRoles(): string[] | null;
  getPrograms(): string[] | null;
  getClasses(): string[] | null;
}

export class ValidationWrapper implements Validate {
  private entity: OnboardingRequest.EntityCase;

  constructor(readonly data: OnboardingRequest) {
    this.entity = data.getEntityCase();
    if (this.entity === OnboardingRequest.EntityCase.ENTITY_NOT_SET)
      throw new OnboardingError(
        MachineError.VALIDATION,
        'Must provide a valid Entity',
        Entity.UNKNOWN,
        Category.REQUEST
      );
  }

  get mapEntity(): Entity {
    switch (this.entity) {
      case OnboardingRequest.EntityCase.ORGANIZATION:
        return Entity.ORGANIZATION;
      case OnboardingRequest.EntityCase.SCHOOL:
        return Entity.SCHOOL;
      case OnboardingRequest.EntityCase.CLASS:
        return Entity.CLASS;
      case OnboardingRequest.EntityCase.USER:
        return Entity.USER;
      default:
        // Unreachable
        throw UNREACHABLE();
    }
  }

  public getEntityId(): string {
    switch (this.entity) {
      case OnboardingRequest.EntityCase.ORGANIZATION:
        return tryGetEntity(
          this.data.getOrganization(),
          Entity.ORGANIZATION
        ).getClientUuid();
      case OnboardingRequest.EntityCase.SCHOOL:
        return tryGetEntity(
          this.data.getSchool(),
          Entity.SCHOOL
        ).getClientUuid();
      case OnboardingRequest.EntityCase.CLASS:
        return tryGetEntity(this.data.getClass(), Entity.CLASS).getClientUuid();
      case OnboardingRequest.EntityCase.USER:
        return tryGetEntity(this.data.getUser(), Entity.USER).getClientUuid();
      default:
        // Unreachable
        throw UNREACHABLE();
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public getSchema(): ObjectSchema<any> {
    switch (this.entity) {
      case OnboardingRequest.EntityCase.ORGANIZATION:
        return organizationSchema;
      case OnboardingRequest.EntityCase.SCHOOL:
        return schoolSchema;
      case OnboardingRequest.EntityCase.CLASS:
        return classSchema;
      case OnboardingRequest.EntityCase.USER:
        return userSchema;
      default:
        // Unreachable
        throw UNREACHABLE();
    }
  }

  public getOrganizationId(): string | null {
    switch (this.entity) {
      case OnboardingRequest.EntityCase.ORGANIZATION:
        return tryGetEntity(
          this.data.getOrganization(),
          Entity.ORGANIZATION
        ).getClientUuid();
      case OnboardingRequest.EntityCase.SCHOOL:
        return tryGetEntity(
          this.data.getSchool(),
          Entity.SCHOOL
        ).getClientOrganizationUuid();
      case OnboardingRequest.EntityCase.CLASS:
        return tryGetEntity(
          this.data.getClass(),
          Entity.CLASS
        ).getClientOrganizationUuid();
      case OnboardingRequest.EntityCase.USER:
        return tryGetEntity(
          this.data.getUser(),
          Entity.USER
        ).getClientOrganizationUuid();
      default:
        // Unreachable
        throw UNREACHABLE();
    }
  }

  public getSchoolId(): string | null {
    switch (this.entity) {
      case OnboardingRequest.EntityCase.ORGANIZATION:
        return null;
      case OnboardingRequest.EntityCase.SCHOOL:
        return tryGetEntity(
          this.data.getSchool(),
          Entity.SCHOOL
        ).getClientUuid();
      case OnboardingRequest.EntityCase.CLASS:
        return tryGetEntity(
          this.data.getClass(),
          Entity.CLASS
        ).getClientSchoolUuid();
      case OnboardingRequest.EntityCase.USER:
        return tryGetEntity(
          this.data.getUser(),
          Entity.USER
        ).getClientSchoolUuid();
      default:
        // Unreachable
        throw UNREACHABLE();
    }
  }

  public getRoles(): string[] | null {
    switch (this.entity) {
      case OnboardingRequest.EntityCase.ORGANIZATION:
      case OnboardingRequest.EntityCase.SCHOOL:
      case OnboardingRequest.EntityCase.CLASS:
        return null;
      case OnboardingRequest.EntityCase.USER:
        return tryGetEntity(this.data.getUser(), Entity.USER).getRoleIdsList();
      default:
        // Unreachable
        throw UNREACHABLE();
    }
  }

  public getPrograms(): string[] | null {
    switch (this.entity) {
      case OnboardingRequest.EntityCase.ORGANIZATION:
      case OnboardingRequest.EntityCase.USER:
        return null;
      case OnboardingRequest.EntityCase.SCHOOL:
        return tryGetEntity(
          this.data.getSchool(),
          Entity.SCHOOL
        ).getProgramIdsList();
      case OnboardingRequest.EntityCase.CLASS:
        return tryGetEntity(
          this.data.getClass(),
          Entity.CLASS
        ).getProgramIdsList();
      default:
        // Unreachable
        throw UNREACHABLE();
    }
  }

  public getClasses(): string[] | null {
    switch (this.entity) {
      case OnboardingRequest.EntityCase.ORGANIZATION:
      case OnboardingRequest.EntityCase.SCHOOL:
      case OnboardingRequest.EntityCase.CLASS:
        return null;
      case OnboardingRequest.EntityCase.USER:
        return tryGetEntity(this.data.getUser(), Entity.USER).getClassIdsList();
      default:
        // Unreachable
        throw UNREACHABLE();
    }
  }

  /**
   *
   * @throws an error if the validation is invalid
   */
  public async validate(): Promise<OnboardingRequest> {
    const errors: OnboardingError[] = [];
    log.debug(`Attempting to validate ${this.entity}: ${this.getEntityId()}`);
    const data = this.data;
    const schema = this.getSchema();

    const props = {
      entityId: this.getEntityId(),
    };

    const { error } = schema.validate(data);
    if (error) {
      errors.push(
        new OnboardingError(
          MachineError.VALIDATION,
          `Entity: ${this.entity} failed validation`,
          this.mapEntity,
          Category.REQUEST,
          props,
          error.details.map((e) => e.message)
        )
      );
    }

    const orgId = this.getOrganizationId();
    if (errors.length > 0) throw new Errors(errors);
    if (!orgId) return data;
    try {
      await Organization.isValid(orgId);
    } catch (e) {
      if (e instanceof OnboardingError) {
        errors.push(e);
      }
      throw e;
    }

    // Make sure the school name is valid
    const schoolId = this.getSchoolId();
    if (errors.length > 0) throw new Errors(errors);
    if (!schoolId) return data;
    try {
      await School.isValid(schoolId);
    } catch (e) {
      if (e instanceof OnboardingError) {
        errors.push(e);
      }
      throw e;
    }

    const classes = this.getClasses();
    if (classes) {
      try {
        await Class.areValid(schoolId, classes);
      } catch (e) {
        if (e instanceof OnboardingError) {
          errors.push(e);
        }
      }
    }

    const programs = this.getPrograms();
    if (programs) {
      try {
        switch (this.entity) {
          case OnboardingRequest.EntityCase.SCHOOL:
            await Organization.programsAreValid(orgId, programs);
            break;
          case OnboardingRequest.EntityCase.CLASS:
            await School.programsAreValid(schoolId, programs);
            break;
          default:
            log.error(
              `If you are seeing this error message there is an application error. This block shouldn't be entered for any Entity other than School or Class`
            );
        }
      } catch (e) {
        if (e instanceof OnboardingError) {
          errors.push(e);
        }
      }
    }

    const roles = this.getRoles();
    if (roles) {
      try {
        await Organization.rolesAreValid(orgId, roles);
      } catch (e) {
        if (e instanceof OnboardingError) {
          errors.push(e);
        }
      }
    }

    if (errors.length > 0) throw new Errors(errors);
    log.debug(
      `Validation for ${this.entity}: ${this.getEntityId()} successful`
    );
    return data;
  }
}

function tryGetEntity<T>(e: T | undefined, entity: Entity): T {
  if (e === undefined)
    throw new OnboardingError(
      MachineError.VALIDATION,
      `Expected to find ${entity} however it was not defined`,
      entity,
      Category.REQUEST
    );
  return e;
}
