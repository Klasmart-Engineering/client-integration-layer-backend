import { Message } from 'google-protobuf';
import { Logger } from 'pino';

import { Category, MachineError, OnboardingError } from '../errors';
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

const dedupeArray = <T>(arr: T[]) => Array.from(new Set(arr));

export interface IdTracked<T extends Message, U> {
  requestId: RequestId;
  protobuf: T;
  data: Partial<ReturnType<T['toObject']> & U>;
}

export type RequestId = {
  id: Uuid;
  n: string;
};

export class RequestBatch {
  private index = 0;

  private constructor(
    private readonly requests: Map<Operation, OnboardingData[]>,
    private invalidRequests: Array<{
      request: OnboardingRequest;
      errorMessage: string;
    }>
  ) {}

  public static fromBatch(reqs: BatchOnboarding, log: Logger): RequestBatch {
    const map = new Map<Operation, OnboardingData[]>();
    const invalidRequests = [];
    let errorMsg = '';

    for (const req of reqs.getRequestsList()) {
      let key = Operation.UNKNOWN;
      let request: OnboardingOperation | undefined = undefined;
      switch (req.getPayloadCase()) {
        case OnboardingRequest.PayloadCase.ORGANIZATION: {
          key = Operation.CREATE_ORGANIZATION;
          const temp = req.getOrganization()!;
          temp.setExternalUuid(temp.getExternalUuid().toLowerCase());
          request = temp;
          break;
        }
        case OnboardingRequest.PayloadCase.SCHOOL: {
          key = Operation.CREATE_SCHOOL;
          const temp = req.getSchool()!;
          temp
            .setExternalUuid(temp.getExternalUuid().toLowerCase())
            .setExternalOrganizationUuid(
              temp.getExternalOrganizationUuid().toLowerCase()
            );
          request = temp;
          break;
        }
        case OnboardingRequest.PayloadCase.CLASS: {
          key = Operation.CREATE_CLASS;
          const temp = req.getClass()!;
          temp
            .setExternalUuid(temp.getExternalUuid().toLowerCase())
            .setExternalSchoolUuid(temp.getExternalSchoolUuid().toLowerCase())
            .setExternalOrganizationUuid(
              temp.getExternalOrganizationUuid().toLowerCase()
            );
          request = temp;
          break;
        }
        case OnboardingRequest.PayloadCase.USER: {
          key = Operation.CREATE_USER;
          const temp = req.getUser()!;
          temp
            .setExternalUuid(temp.getExternalUuid().toLowerCase())
            .setExternalOrganizationUuid(
              temp.getExternalOrganizationUuid().toLowerCase()
            );
          request = temp;
          break;
        }
        case OnboardingRequest.PayloadCase.LINK_ENTITIES: {
          const r = req.getLinkEntities();
          if (!r) {
            errorMsg = `Expected valid 'Link' payload. `;
            log.error(errorMsg);
            break;
          }
          switch (r.getLinkCase()) {
            case Link.LinkCase.ADD_USERS_TO_ORGANIZATION: {
              key = Operation.ADD_USERS_TO_ORGANIZATION;
              const temp = r.getAddUsersToOrganization()!;
              temp
                .setExternalOrganizationUuid(
                  temp.getExternalOrganizationUuid().toLowerCase()
                )
                .setExternalUserUuidsList(
                  dedupeArray(
                    temp
                      .getExternalUserUuidsList()
                      .map((id) => id.toLowerCase())
                  )
                )
                .setRoleIdentifiersList(
                  dedupeArray(temp.getRoleIdentifiersList())
                );
              request = temp;
              break;
            }
            case Link.LinkCase.ADD_ORGANIZATION_ROLES_TO_USER: {
              key = Operation.ADD_ORGANIZATION_ROLES_TO_USER;
              const temp = r.getAddOrganizationRolesToUser()!;
              temp
                .setExternalOrganizationUuid(
                  temp.getExternalOrganizationUuid().toLowerCase()
                )
                .setExternalUserUuid(temp.getExternalUserUuid().toLowerCase())
                .setRoleIdentifiersList(
                  dedupeArray(temp.getRoleIdentifiersList())
                );
              request = temp;
              break;
            }
            case Link.LinkCase.ADD_PROGRAMS_TO_SCHOOL: {
              key = Operation.ADD_PROGRAMS_TO_SCHOOL;
              const temp = r.getAddProgramsToSchool()!;
              temp
                .setExternalSchoolUuid(
                  temp.getExternalSchoolUuid().toLowerCase()
                )
                .setProgramNamesList(dedupeArray(temp.getProgramNamesList()));
              request = temp;
              break;
            }
            case Link.LinkCase.ADD_CLASSES_TO_SCHOOL: {
              key = Operation.ADD_CLASSES_TO_SCHOOL;
              const temp = r.getAddClassesToSchool()!;
              temp
                .setExternalSchoolUuid(
                  temp.getExternalSchoolUuid().toLowerCase()
                )
                .setExternalClassUuidsList(
                  dedupeArray(
                    temp
                      .getExternalClassUuidsList()
                      .map((id) => id.toLowerCase())
                  )
                );
              request = temp;
              break;
            }
            case Link.LinkCase.ADD_USERS_TO_SCHOOL: {
              key = Operation.ADD_USERS_TO_SCHOOL;
              const temp = r.getAddUsersToSchool()!;
              temp
                .setExternalSchoolUuid(
                  temp.getExternalSchoolUuid().toLowerCase()
                )
                .setExternalUserUuidsList(
                  dedupeArray(
                    temp
                      .getExternalUserUuidsList()
                      .map((id) => id.toLowerCase())
                  )
                );
              request = temp;
              break;
            }
            case Link.LinkCase.ADD_PROGRAMS_TO_CLASS: {
              key = Operation.ADD_PROGRAMS_TO_CLASS;
              const temp = r.getAddProgramsToClass()!;
              temp
                .setExternalClassUuid(temp.getExternalClassUuid().toLowerCase())
                .setProgramNamesList(dedupeArray(temp.getProgramNamesList()));
              request = temp;
              break;
            }
            case Link.LinkCase.ADD_USERS_TO_CLASS: {
              key = Operation.ADD_USERS_TO_CLASS;
              const temp = r.getAddUsersToClass()!;
              temp
                .setExternalClassUuid(temp.getExternalClassUuid().toLowerCase())
                .setExternalStudentUuidList(
                  dedupeArray(
                    temp
                      .getExternalStudentUuidList()
                      .map((id) => id.toLowerCase())
                  )
                )
                .setExternalTeacherUuidList(
                  dedupeArray(
                    temp
                      .getExternalTeacherUuidList()
                      .map((id) => id.toLowerCase())
                  )
                );
              request = temp;
              break;
            }
            default:
              errorMsg = `Expected to find valid 'Link' request however the protobuf payload
              was not found. `;
              log.error(errorMsg);
              break;
          }
          break;
        }
        default:
          errorMsg = `Expected to find a valid request type as the payload however found nothing. `;
          log.error(errorMsg);
          break;
      }

      if (request === undefined) {
        const addMsg =
          'The onboarding request to be defined, however when parsing we were unable to find a valid request.';
        log.error(addMsg);
        errorMsg = errorMsg + addMsg;
        invalidRequests.push({ request: req, errorMessage: errorMsg });
        continue;
      }

      const arr = map.get(key) || [];
      const tempId = req.getRequestId();
      let reqId;
      if (tempId) {
        reqId = {
          id: tempId.getId(),
          n: tempId.getN(),
        };
      } else {
        reqId = {
          id: 'NOT PROVIDED',
          n: 'NOT PROVIDED',
        };
      }
      arr.push({
        requestId: reqId,
        protobuf: request,
        data: request.toObject(),
      } as OnboardingData);
      map.set(key, arr);
    }
    const details: Record<string, number> = {};
    for (const [k, v] of map) details[k] = v.length;

    log.info(
      { operationCounts: details },
      'received incoming batch of requests'
    );
    return new RequestBatch(map, invalidRequests);
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

  public getInvalidReqs(): Array<{
    request: OnboardingRequest;
    errorMessage: string;
  }> {
    return this.invalidRequests;
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
  return new RequestMetadata().setId(id.id).setN(id.n);
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
