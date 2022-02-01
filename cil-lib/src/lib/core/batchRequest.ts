import { Message } from 'google-protobuf';
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
  RequestMetadata,
  School,
  User,
} from '../protos';
import { Operation, OPERATION_ORDERING } from '../types/operation';
import { Uuid } from '../utils';

import {
  IAddClassesToSchool,
  IAddOrganizationRolesToUsers,
  IAddProgramsToClasses,
  IAddProgramsToSchools,
  IAddUsersToClasses,
  IAddUsersToOrganizations,
  IAddUsersToSchools,
  ICreateClass,
  ICreateOrganization,
  ICreateSchool,
  ICreateUser,
} from '.';

export interface IdTracked<T extends Message, U> {
  requestId: RequestId;
  protobuf: T;
  data: Partial<ReturnType<T['toObject']> & U>;
}

export type RequestId = {
  id: Uuid;
  n: number;
};

export class RequestBatch {
  private index = 0;

  private constructor(
    private readonly requests: Map<Operation, OnboardingData[]>
  ) {}

  public static fromBatch(reqs: BatchOnboarding, log: Logger): RequestBatch {
    const map = new Map<Operation, OnboardingData[]>();
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
                `Expected to find valid 'Link' request however the protobuf payload
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
      const tempId = req.getRequestId();
      let reqId;
      if (tempId) {
        reqId = {
          id: tempId.getId(),
          n: tempId.getNumber(),
        };
      } else {
        reqId = {
          id: 'NOT PROVIDED',
          n: -1,
        };
      }
      arr.push({
        requestId: reqId,
        protobuf: request,
        data: request.toObject(),
      } as OnboardingData);
      map.set(key, arr);
    }
    return new RequestBatch(map);
  }

  get createOrganizations() {
    const entity = this.requests.get(Operation.CREATE_ORGANIZATION);
    if (entity) return entity as ICreateOrganization[];
    return [];
  }

  get createSchools() {
    const entity = this.requests.get(Operation.CREATE_SCHOOL);
    if (entity) return entity as ICreateSchool[];
    return [];
  }

  get createClasses() {
    const entity = this.requests.get(Operation.CREATE_CLASS);
    if (entity) return entity as ICreateClass[];
    return [];
  }

  get createUsers() {
    const entity = this.requests.get(Operation.CREATE_USER);
    if (entity) return entity as ICreateUser[];
    return [];
  }

  get addUsersToOrganization() {
    const entity = this.requests.get(Operation.ADD_USERS_TO_ORGANIZATION);
    if (entity) return entity as IAddUsersToOrganizations[];
    return [];
  }

  get addOrganizationRolesToUser() {
    const entity = this.requests.get(Operation.ADD_ORGANIZATION_ROLES_TO_USER);
    if (entity) return entity as IAddOrganizationRolesToUsers[];
    return [];
  }

  get addUsersToSchool() {
    const entity = this.requests.get(Operation.ADD_USERS_TO_SCHOOL);
    if (entity) return entity as IAddUsersToSchools[];
    return [];
  }

  get addUsersToClass() {
    const entity = this.requests.get(Operation.ADD_USERS_TO_CLASS);
    if (entity) return entity as IAddUsersToClasses[];
    return [];
  }

  get addProgramsToSchool() {
    const entity = this.requests.get(Operation.ADD_PROGRAMS_TO_SCHOOL);
    if (entity) return entity as IAddProgramsToSchools[];
    return [];
  }

  get addProgramsToClass() {
    const entity = this.requests.get(Operation.ADD_PROGRAMS_TO_CLASS);
    if (entity) return entity as IAddProgramsToClasses[];
    return [];
  }

  get addClassesToSchool() {
    const entity = this.requests.get(Operation.ADD_CLASSES_TO_SCHOOL);
    if (entity) return entity as IAddClassesToSchool[];
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

export function requestIdToProtobuf(id: RequestId): RequestMetadata {
  return new RequestMetadata().setId(id.id).setNumber(id.n);
}

export type OnboardingOperation =
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

export type OnboardingData =
  | ICreateOrganization
  | ICreateSchool
  | ICreateClass
  | ICreateUser
  | IAddUsersToOrganizations
  | IAddOrganizationRolesToUsers
  | IAddUsersToSchools
  | IAddUsersToClasses
  | IAddProgramsToSchools
  | IAddProgramsToClasses
  | IAddClassesToSchool;
