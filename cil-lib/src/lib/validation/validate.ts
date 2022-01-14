import { ObjectSchema } from 'joi';

import { log } from '../..';
import { Organization, School } from '../entities';
import {
  Category,
  Errors,
  MachineError,
  OnboardingError,
  UNREACHABLE,
} from '../errors';
import { OnboardingRequest } from '../protos/api_pb';
import { Entity } from '../types';

import {
  classSchema,
  organizationSchema,
  schoolSchema,
  userSchema,
  VALIDATION_RULES,
} from '.';

export interface Validate {
  data: OnboardingRequest;

  validate(): Promise<OnboardingRequest>;
  getEntityId(): string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getSchema(): ObjectSchema<any>;

  getOrganizationId(): string | null;
  getSchoolId(): string | null;
  // getRoles(): string[] | null;
  // getPrograms(): string[] | null;
  // getClasses(): string[] | null;
  toObject(): void;
  customHook(): void;
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
        ).getExternalUuid();
      case OnboardingRequest.EntityCase.SCHOOL:
        return tryGetEntity(
          this.data.getSchool(),
          Entity.SCHOOL
        ).getExternalUuid();
      case OnboardingRequest.EntityCase.CLASS:
        return tryGetEntity(
          this.data.getClass(),
          Entity.CLASS
        ).getExternalUuid();
      case OnboardingRequest.EntityCase.USER:
        return tryGetEntity(this.data.getUser(), Entity.USER).getExternalUuid();
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
        ).getExternalUuid();
      case OnboardingRequest.EntityCase.SCHOOL:
        return tryGetEntity(
          this.data.getSchool(),
          Entity.SCHOOL
        ).getExternalOrganizationUuid();
      case OnboardingRequest.EntityCase.CLASS:
        return tryGetEntity(
          this.data.getClass(),
          Entity.CLASS
        ).getExternalOrganizationUuid();
      case OnboardingRequest.EntityCase.USER:
        return tryGetEntity(
          this.data.getUser(),
          Entity.USER
        ).getExternalOrganizationUuid();
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
        ).getExternalUuid();
      case OnboardingRequest.EntityCase.CLASS:
        return tryGetEntity(
          this.data.getClass(),
          Entity.CLASS
        ).getExternalSchoolUuid();
      case OnboardingRequest.EntityCase.USER:
        return tryGetEntity(
          this.data.getUser(),
          Entity.USER
        ).getExternalSchoolUuid();
      default:
        // Unreachable
        throw UNREACHABLE();
    }
  }

  public toObject(): Record<string, unknown> {
    switch (this.entity) {
      case OnboardingRequest.EntityCase.ORGANIZATION:
        return tryGetEntity(this.data.toObject().organization, this.mapEntity);
      case OnboardingRequest.EntityCase.SCHOOL:
        return tryGetEntity(this.data.toObject().school, this.mapEntity);
      case OnboardingRequest.EntityCase.CLASS:
        return tryGetEntity(this.data.toObject().pb_class, this.mapEntity);
      case OnboardingRequest.EntityCase.USER: {
        return tryGetEntity(this.data.toObject().user, this.mapEntity);
      }
      default:
        throw UNREACHABLE();
    }
  }

  public customHook(): void {
    switch (this.entity) {
      case OnboardingRequest.EntityCase.USER: {
        const { phone, email } = tryGetEntity(
          this.data.toObject().user,
          this.mapEntity
        );
        const phoneRegex = new RegExp(VALIDATION_RULES.PHONE_REGEX);
        const emailRegex = new RegExp(VALIDATION_RULES.EMAIL_REGEX);
        const phoneIsValid = phoneRegex.exec(phone);
        const emailIsValid = emailRegex.exec(email);
        if (phoneIsValid === null && emailIsValid === null)
          throw new OnboardingError(
            MachineError.VALIDATION,
            'Entity is invalid',
            this.mapEntity,
            Category.REQUEST,
            {},
            [
              'Phone and Email was invalid',
              'Must provide a combination of either phone + username or email + username',
            ]
          );
        break;
      }
      case OnboardingRequest.EntityCase.ORGANIZATION:
      case OnboardingRequest.EntityCase.SCHOOL:
      case OnboardingRequest.EntityCase.CLASS:
      default:
    }
  }

  // public getRoles(): string[] | null {
  //   switch (this.entity) {
  //     case OnboardingRequest.EntityCase.ORGANIZATION:
  //     case OnboardingRequest.EntityCase.SCHOOL:
  //     case OnboardingRequest.EntityCase.CLASS:
  //       return null;
  //     case OnboardingRequest.EntityCase.USER:
  //       return tryGetEntity(this.data.getUser(), Entity.USER).getRoleIdsList();
  //     default:
  //       // Unreachable
  //       throw UNREACHABLE();
  //   }
  // }

  // public getPrograms(): string[] | null {
  //   switch (this.entity) {
  //     case OnboardingRequest.EntityCase.ORGANIZATION:
  //     case OnboardingRequest.EntityCase.USER:
  //       return null;
  //     case OnboardingRequest.EntityCase.SCHOOL:
  //       return tryGetEntity(
  //         this.data.getSchool(),
  //         Entity.SCHOOL
  //       ).getProgramIdsList();
  //     case OnboardingRequest.EntityCase.CLASS:
  //       return tryGetEntity(
  //         this.data.getClass(),
  //         Entity.CLASS
  //       ).getProgramIdsList();
  //     default:
  //       // Unreachable
  //       throw UNREACHABLE();
  //   }
  // }

  // public getClasses(): string[] | null {
  //   switch (this.entity) {
  //     case OnboardingRequest.EntityCase.ORGANIZATION:
  //     case OnboardingRequest.EntityCase.SCHOOL:
  //     case OnboardingRequest.EntityCase.CLASS:
  //       return null;
  //     case OnboardingRequest.EntityCase.USER:
  //       return tryGetEntity(this.data.getUser(), Entity.USER).getClassIdsList();
  //     default:
  //       // Unreachable
  //       throw UNREACHABLE();
  //   }
  // }

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

    const { error } = schema.validate(this.toObject(), {
      abortEarly: false,
      allowUnknown: false,
    });
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

    try {
      this.customHook();
    } catch (e) {
      if (e instanceof OnboardingError) {
        errors.push(e);
      }
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
    }

    /* Looks like we're no longer validating these?
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
    */

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
