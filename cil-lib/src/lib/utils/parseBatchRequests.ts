import { Logger } from 'pino';

import {
  BAD_REQUEST,
  BASE_PATH,
  Category,
  MachineError,
  OnboardingError,
} from '../errors';
import {
  AddClassesToSchool,
  AddOrganizationRolesToUser,
  AddProgramsToClass,
  AddProgramsToSchool,
  AddUsersToClass,
  AddUsersToOrganization,
  AddUsersToSchool,
  BatchOnboarding,
  Class,
  Link,
  OnboardingRequest,
  Organization,
  School,
  User,
} from '../protos';
import { Operation, OPERATION_ORDERING } from '../types/operation';

import { Uuid } from '.';

export type IdTracked<T> = {
  requestId: Uuid;
  inner: T;
};

export class RequestBatch {
  private index = 0;

  private constructor(
    private readonly requests: Map<Operation, IdTracked<OnboardingOperation>[]>
  ) {}

  public static fromBatch(reqs: BatchOnboarding, log: Logger): RequestBatch {
    const map = new Map();
    for (const req of reqs.getRequestsList()) {
      let key = Operation.UNKNOWN;
      let request: OnboardingOperation | undefined = undefined;
      switch (req.getPayloadCase()) {
        case OnboardingRequest.PayloadCase.ORGANIZATION: {
          key = Operation.CREATE_ORGANIZATION;
          request = req.getOrganization();
          break;
        }
        case OnboardingRequest.PayloadCase.SCHOOL: {
          key = Operation.CREATE_SCHOOL;
          request = req.getSchool();
          break;
        }
        case OnboardingRequest.PayloadCase.CLASS: {
          key = Operation.CREATE_CLASS;
          request = req.getClass();
          break;
        }
        case OnboardingRequest.PayloadCase.USER: {
          key = Operation.CREATE_USER;
          request = req.getUser();
          break;
        }
        case OnboardingRequest.PayloadCase.LINK_ENTITIES: {
          const r = req.getLinkEntities();
          if (!r)
            throw BAD_REQUEST(
              `Expected valid 'Link' payload`,
              [...BASE_PATH, 'linkEntities'],
              log
            );
          switch (r.getLinkCase()) {
            case Link.LinkCase.ADD_USERS_TO_ORGANIZATION: {
              key = Operation.ADD_USERS_TO_ORGANIZATION;
              request = r.getAddUsersToOrganization();
              break;
            }
            case Link.LinkCase.ADD_ORGANIZATION_ROLES_TO_USER: {
              key = Operation.ADD_ORGANIZATION_ROLES_TO_USER;
              request = r.getAddOrganizationRolesToUser();
              break;
            }
            case Link.LinkCase.ADD_PROGRAMS_TO_SCHOOL: {
              key = Operation.ADD_PROGRAMS_TO_SCHOOL;
              request = r.getAddProgramsToSchool();
              break;
            }
            case Link.LinkCase.ADD_CLASSES_TO_SCHOOL: {
              key = Operation.ADD_CLASSES_TO_SCHOOL;
              request = r.getAddClassesToSchool();
              break;
            }
            case Link.LinkCase.ADD_USERS_TO_SCHOOL: {
              key = Operation.ADD_USERS_TO_SCHOOL;
              request = r.getAddUsersToSchool();
              break;
            }
            case Link.LinkCase.ADD_PROGRAMS_TO_CLASS: {
              key = Operation.ADD_PROGRAMS_TO_CLASS;
              request = r.getAddProgramsToClass();
              break;
            }
            case Link.LinkCase.ADD_USERS_TO_CLASS: {
              key = Operation.ADD_USERS_TO_CLASS;
              request = r.getAddUsersToClass();
              break;
            }
            default:
              throw BAD_REQUEST(
                `Expected to find valid 'Link' request however the inner payload
              was not found`,
                [...BASE_PATH, 'linkEntities'],
                log
              );
          }
          break;
        }
        default:
          throw BAD_REQUEST(
            `Expected to find a valid request type as the payload however found nothing`,
            [...BASE_PATH],
            log
          );
      }
      if (request === undefined)
        throw BAD_REQUEST(
          'Expected the onboarding request to be defined, however when parsing we were unable to find a valid request',
          [...BASE_PATH],
          log
        );
      const arr = map.get(key) || [];
      arr.push({ requestId: req.getRequestId(), inner: request });
      map.set(key, arr);
    }
    return new RequestBatch(map);
  }

  get createOrganizations(): IdTracked<Organization>[] {
    const entity = this.requests.get(Operation.CREATE_ORGANIZATION);
    if (entity) return entity as IdTracked<Organization>[];
    return [];
  }

  get createSchools(): IdTracked<School>[] {
    const entity = this.requests.get(Operation.CREATE_SCHOOL);
    if (entity) return entity as IdTracked<School>[];
    return [];
  }

  get createClasses(): IdTracked<Class>[] {
    const entity = this.requests.get(Operation.CREATE_CLASS);
    if (entity) return entity as IdTracked<Class>[];
    return [];
  }

  get createUsers(): IdTracked<User>[] {
    const entity = this.requests.get(Operation.CREATE_USER);
    if (entity) return entity as IdTracked<User>[];
    return [];
  }

  get addUsersToOrganization(): IdTracked<AddUsersToOrganization>[] {
    const entity = this.requests.get(Operation.ADD_USERS_TO_ORGANIZATION);
    if (entity) return entity as IdTracked<AddUsersToOrganization>[];
    return [];
  }

  get addOrganizationRolesToUser(): IdTracked<AddOrganizationRolesToUser>[] {
    const entity = this.requests.get(Operation.ADD_ORGANIZATION_ROLES_TO_USER);
    if (entity) return entity as IdTracked<AddOrganizationRolesToUser>[];
    return [];
  }

  get addUsersToSchool(): IdTracked<AddUsersToSchool>[] {
    const entity = this.requests.get(Operation.ADD_USERS_TO_SCHOOL);
    if (entity) return entity as IdTracked<AddUsersToSchool>[];
    return [];
  }

  get addUsersToClass(): IdTracked<AddUsersToClass>[] {
    const entity = this.requests.get(Operation.ADD_USERS_TO_CLASS);
    if (entity) return entity as IdTracked<AddUsersToClass>[];
    return [];
  }

  get addProgramsToSchool(): IdTracked<AddProgramsToSchool>[] {
    const entity = this.requests.get(Operation.ADD_PROGRAMS_TO_SCHOOL);
    if (entity) return entity as IdTracked<AddProgramsToSchool>[];
    return [];
  }

  get addProgramsToClass(): IdTracked<AddProgramsToClass>[] {
    const entity = this.requests.get(Operation.ADD_PROGRAMS_TO_CLASS);
    if (entity) return entity as IdTracked<AddProgramsToClass>[];
    return [];
  }

  get addClassesToSchool(): IdTracked<AddClassesToSchool>[] {
    const entity = this.requests.get(Operation.ADD_CLASSES_TO_SCHOOL);
    if (entity) return entity as IdTracked<AddClassesToSchool>[];
    return [];
  }

  public getOperation(op: Operation) {
    switch (op) {
      case Operation.CREATE_ORGANIZATION:
        return this.createOrganizations;
      case Operation.CREATE_SCHOOL:
        return this.createSchools;
      case Operation.CREATE_CLASS:
        return this.createClasses;
      case Operation.CREATE_USER:
        return this.createUsers;
      case Operation.ADD_PROGRAMS_TO_SCHOOL:
        return this.addProgramsToSchool;
      case Operation.ADD_PROGRAMS_TO_CLASS:
        return this.addProgramsToClass;
      case Operation.ADD_CLASSES_TO_SCHOOL:
        return this.addClassesToSchool;
      case Operation.ADD_USERS_TO_ORGANIZATION:
        return this.addUsersToOrganization;
      case Operation.ADD_ORGANIZATION_ROLES_TO_USER:
        return this.addOrganizationRolesToUser;
      case Operation.ADD_USERS_TO_SCHOOL:
        return this.addUsersToSchool;
      case Operation.ADD_USERS_TO_CLASS:
        return this.addUsersToClass;
      default:
        throw new OnboardingError(
          MachineError.APP_CONFIG,
          'When switching on an operation found an uncaught branch',
          Category.APP
        );
    }
  }

  public getNextOperation(): Operation | null {
    if (this.index >= OPERATION_ORDERING.length) return null;
    const op = OPERATION_ORDERING[this.index];
    this.index += 1;
    const data = this.getOperation(op);
    if (data.length === 0) return this.getNextOperation();
    return op;
  }
}

type OnboardingOperation =
  | Organization
  | School
  | Class
  | User
  | AddUsersToOrganization
  | AddOrganizationRolesToUser
  | AddUsersToSchool
  | AddUsersToClass
  | AddProgramsToSchool
  | AddProgramsToClass
  | AddClassesToSchool;
