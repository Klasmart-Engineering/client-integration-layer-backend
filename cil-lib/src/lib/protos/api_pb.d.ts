// package: cil_onboarding.api
// file: api.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";

export class Organization extends jspb.Message { 
    getExternalUuid(): string;
    setExternalUuid(value: string): Organization;
    getName(): string;
    setName(value: string): Organization;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Organization.AsObject;
    static toObject(includeInstance: boolean, msg: Organization): Organization.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Organization, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Organization;
    static deserializeBinaryFromReader(message: Organization, reader: jspb.BinaryReader): Organization;
}

export namespace Organization {
    export type AsObject = {
        externalUuid: string,
        name: string,
    }
}

export class School extends jspb.Message { 
    getExternalUuid(): string;
    setExternalUuid(value: string): School;
    getExternalOrganizationUuid(): string;
    setExternalOrganizationUuid(value: string): School;
    getName(): string;
    setName(value: string): School;
    getShortCode(): string;
    setShortCode(value: string): School;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): School.AsObject;
    static toObject(includeInstance: boolean, msg: School): School.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: School, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): School;
    static deserializeBinaryFromReader(message: School, reader: jspb.BinaryReader): School;
}

export namespace School {
    export type AsObject = {
        externalUuid: string,
        externalOrganizationUuid: string,
        name: string,
        shortCode: string,
    }
}

export class Class extends jspb.Message { 
    getExternalUuid(): string;
    setExternalUuid(value: string): Class;
    getExternalOrganizationUuid(): string;
    setExternalOrganizationUuid(value: string): Class;
    getName(): string;
    setName(value: string): Class;
    getExternalSchoolUuid(): string;
    setExternalSchoolUuid(value: string): Class;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Class.AsObject;
    static toObject(includeInstance: boolean, msg: Class): Class.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Class, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Class;
    static deserializeBinaryFromReader(message: Class, reader: jspb.BinaryReader): Class;
}

export namespace Class {
    export type AsObject = {
        externalUuid: string,
        externalOrganizationUuid: string,
        name: string,
        externalSchoolUuid: string,
    }
}

export class User extends jspb.Message { 
    getExternalUuid(): string;
    setExternalUuid(value: string): User;
    getExternalOrganizationUuid(): string;
    setExternalOrganizationUuid(value: string): User;
    getEmail(): string;
    setEmail(value: string): User;
    getPhone(): string;
    setPhone(value: string): User;
    getUsername(): string;
    setUsername(value: string): User;
    getGivenName(): string;
    setGivenName(value: string): User;
    getFamilyName(): string;
    setFamilyName(value: string): User;
    getGender(): Gender;
    setGender(value: Gender): User;
    getDateOfBirth(): string;
    setDateOfBirth(value: string): User;
    getShortCode(): string;
    setShortCode(value: string): User;
    clearRoleNamesList(): void;
    getRoleNamesList(): Array<string>;
    setRoleNamesList(value: Array<string>): User;
    addRoleNames(value: string, index?: number): string;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): User.AsObject;
    static toObject(includeInstance: boolean, msg: User): User.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: User, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): User;
    static deserializeBinaryFromReader(message: User, reader: jspb.BinaryReader): User;
}

export namespace User {
    export type AsObject = {
        externalUuid: string,
        externalOrganizationUuid: string,
        email: string,
        phone: string,
        username: string,
        givenName: string,
        familyName: string,
        gender: Gender,
        dateOfBirth: string,
        shortCode: string,
        roleNamesList: Array<string>,
    }
}

export class AddUsersToClass extends jspb.Message { 
    getExternalClassUuid(): string;
    setExternalClassUuid(value: string): AddUsersToClass;
    clearExternalTeacherUuidList(): void;
    getExternalTeacherUuidList(): Array<string>;
    setExternalTeacherUuidList(value: Array<string>): AddUsersToClass;
    addExternalTeacherUuid(value: string, index?: number): string;
    clearExternalStudentUuidList(): void;
    getExternalStudentUuidList(): Array<string>;
    setExternalStudentUuidList(value: Array<string>): AddUsersToClass;
    addExternalStudentUuid(value: string, index?: number): string;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): AddUsersToClass.AsObject;
    static toObject(includeInstance: boolean, msg: AddUsersToClass): AddUsersToClass.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: AddUsersToClass, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): AddUsersToClass;
    static deserializeBinaryFromReader(message: AddUsersToClass, reader: jspb.BinaryReader): AddUsersToClass;
}

export namespace AddUsersToClass {
    export type AsObject = {
        externalClassUuid: string,
        externalTeacherUuidList: Array<string>,
        externalStudentUuidList: Array<string>,
    }
}

export class AddUserToSchool extends jspb.Message { 
    clearExternalUserUuidsList(): void;
    getExternalUserUuidsList(): Array<string>;
    setExternalUserUuidsList(value: Array<string>): AddUserToSchool;
    addExternalUserUuids(value: string, index?: number): string;
    getExternalSchoolUuid(): string;
    setExternalSchoolUuid(value: string): AddUserToSchool;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): AddUserToSchool.AsObject;
    static toObject(includeInstance: boolean, msg: AddUserToSchool): AddUserToSchool.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: AddUserToSchool, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): AddUserToSchool;
    static deserializeBinaryFromReader(message: AddUserToSchool, reader: jspb.BinaryReader): AddUserToSchool;
}

export namespace AddUserToSchool {
    export type AsObject = {
        externalUserUuidsList: Array<string>,
        externalSchoolUuid: string,
    }
}

export class AddProgramsToSchool extends jspb.Message { 
    getExternalOrganizationUuid(): string;
    setExternalOrganizationUuid(value: string): AddProgramsToSchool;
    getExternalSchoolUuid(): string;
    setExternalSchoolUuid(value: string): AddProgramsToSchool;
    clearProgramNamesList(): void;
    getProgramNamesList(): Array<string>;
    setProgramNamesList(value: Array<string>): AddProgramsToSchool;
    addProgramNames(value: string, index?: number): string;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): AddProgramsToSchool.AsObject;
    static toObject(includeInstance: boolean, msg: AddProgramsToSchool): AddProgramsToSchool.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: AddProgramsToSchool, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): AddProgramsToSchool;
    static deserializeBinaryFromReader(message: AddProgramsToSchool, reader: jspb.BinaryReader): AddProgramsToSchool;
}

export namespace AddProgramsToSchool {
    export type AsObject = {
        externalOrganizationUuid: string,
        externalSchoolUuid: string,
        programNamesList: Array<string>,
    }
}

export class AddProgramsToClass extends jspb.Message { 
    getExternalOrganizationUuid(): string;
    setExternalOrganizationUuid(value: string): AddProgramsToClass;
    getExternalClassUuid(): string;
    setExternalClassUuid(value: string): AddProgramsToClass;
    clearProgramNamesList(): void;
    getProgramNamesList(): Array<string>;
    setProgramNamesList(value: Array<string>): AddProgramsToClass;
    addProgramNames(value: string, index?: number): string;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): AddProgramsToClass.AsObject;
    static toObject(includeInstance: boolean, msg: AddProgramsToClass): AddProgramsToClass.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: AddProgramsToClass, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): AddProgramsToClass;
    static deserializeBinaryFromReader(message: AddProgramsToClass, reader: jspb.BinaryReader): AddProgramsToClass;
}

export namespace AddProgramsToClass {
    export type AsObject = {
        externalOrganizationUuid: string,
        externalClassUuid: string,
        programNamesList: Array<string>,
    }
}

export class AddClassesToSchool extends jspb.Message { 
    getExternalSchoolUuid(): string;
    setExternalSchoolUuid(value: string): AddClassesToSchool;
    clearExternalClassUuidsList(): void;
    getExternalClassUuidsList(): Array<string>;
    setExternalClassUuidsList(value: Array<string>): AddClassesToSchool;
    addExternalClassUuids(value: string, index?: number): string;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): AddClassesToSchool.AsObject;
    static toObject(includeInstance: boolean, msg: AddClassesToSchool): AddClassesToSchool.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: AddClassesToSchool, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): AddClassesToSchool;
    static deserializeBinaryFromReader(message: AddClassesToSchool, reader: jspb.BinaryReader): AddClassesToSchool;
}

export namespace AddClassesToSchool {
    export type AsObject = {
        externalSchoolUuid: string,
        externalClassUuidsList: Array<string>,
    }
}

export class AddOrganizationRolesToUser extends jspb.Message { 
    getExternalOrganizationUuid(): string;
    setExternalOrganizationUuid(value: string): AddOrganizationRolesToUser;
    getExternalUserUuid(): string;
    setExternalUserUuid(value: string): AddOrganizationRolesToUser;
    clearRoleNamesList(): void;
    getRoleNamesList(): Array<string>;
    setRoleNamesList(value: Array<string>): AddOrganizationRolesToUser;
    addRoleNames(value: string, index?: number): string;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): AddOrganizationRolesToUser.AsObject;
    static toObject(includeInstance: boolean, msg: AddOrganizationRolesToUser): AddOrganizationRolesToUser.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: AddOrganizationRolesToUser, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): AddOrganizationRolesToUser;
    static deserializeBinaryFromReader(message: AddOrganizationRolesToUser, reader: jspb.BinaryReader): AddOrganizationRolesToUser;
}

export namespace AddOrganizationRolesToUser {
    export type AsObject = {
        externalOrganizationUuid: string,
        externalUserUuid: string,
        roleNamesList: Array<string>,
    }
}

export class AddUsersToOrganizations extends jspb.Message { 
    getExternalOrganizationUuid(): string;
    setExternalOrganizationUuid(value: string): AddUsersToOrganizations;
    clearRoleNamesList(): void;
    getRoleNamesList(): Array<string>;
    setRoleNamesList(value: Array<string>): AddUsersToOrganizations;
    addRoleNames(value: string, index?: number): string;
    clearExternalUserUuidsList(): void;
    getExternalUserUuidsList(): Array<string>;
    setExternalUserUuidsList(value: Array<string>): AddUsersToOrganizations;
    addExternalUserUuids(value: string, index?: number): string;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): AddUsersToOrganizations.AsObject;
    static toObject(includeInstance: boolean, msg: AddUsersToOrganizations): AddUsersToOrganizations.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: AddUsersToOrganizations, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): AddUsersToOrganizations;
    static deserializeBinaryFromReader(message: AddUsersToOrganizations, reader: jspb.BinaryReader): AddUsersToOrganizations;
}

export namespace AddUsersToOrganizations {
    export type AsObject = {
        externalOrganizationUuid: string,
        roleNamesList: Array<string>,
        externalUserUuidsList: Array<string>,
    }
}

export class Link extends jspb.Message { 

    hasAddUsersToOrganizations(): boolean;
    clearAddUsersToOrganizations(): void;
    getAddUsersToOrganizations(): AddUsersToOrganizations | undefined;
    setAddUsersToOrganizations(value?: AddUsersToOrganizations): Link;

    hasAddOrganizationRolesToUser(): boolean;
    clearAddOrganizationRolesToUser(): void;
    getAddOrganizationRolesToUser(): AddOrganizationRolesToUser | undefined;
    setAddOrganizationRolesToUser(value?: AddOrganizationRolesToUser): Link;

    hasAddUserToSchool(): boolean;
    clearAddUserToSchool(): void;
    getAddUserToSchool(): AddUserToSchool | undefined;
    setAddUserToSchool(value?: AddUserToSchool): Link;

    hasAddUsersToClass(): boolean;
    clearAddUsersToClass(): void;
    getAddUsersToClass(): AddUsersToClass | undefined;
    setAddUsersToClass(value?: AddUsersToClass): Link;

    hasAddProgramsToSchool(): boolean;
    clearAddProgramsToSchool(): void;
    getAddProgramsToSchool(): AddProgramsToSchool | undefined;
    setAddProgramsToSchool(value?: AddProgramsToSchool): Link;

    hasAddProgramsToClass(): boolean;
    clearAddProgramsToClass(): void;
    getAddProgramsToClass(): AddProgramsToClass | undefined;
    setAddProgramsToClass(value?: AddProgramsToClass): Link;

    hasAddClassesToSchool(): boolean;
    clearAddClassesToSchool(): void;
    getAddClassesToSchool(): AddClassesToSchool | undefined;
    setAddClassesToSchool(value?: AddClassesToSchool): Link;

    getLinkCase(): Link.LinkCase;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Link.AsObject;
    static toObject(includeInstance: boolean, msg: Link): Link.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Link, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Link;
    static deserializeBinaryFromReader(message: Link, reader: jspb.BinaryReader): Link;
}

export namespace Link {
    export type AsObject = {
        addUsersToOrganizations?: AddUsersToOrganizations.AsObject,
        addOrganizationRolesToUser?: AddOrganizationRolesToUser.AsObject,
        addUserToSchool?: AddUserToSchool.AsObject,
        addUsersToClass?: AddUsersToClass.AsObject,
        addProgramsToSchool?: AddProgramsToSchool.AsObject,
        addProgramsToClass?: AddProgramsToClass.AsObject,
        addClassesToSchool?: AddClassesToSchool.AsObject,
    }

    export enum LinkCase {
        LINK_NOT_SET = 0,
        ADD_USERS_TO_ORGANIZATIONS = 1,
        ADD_ORGANIZATION_ROLES_TO_USER = 2,
        ADD_USER_TO_SCHOOL = 3,
        ADD_USERS_TO_CLASS = 4,
        ADD_PROGRAMS_TO_SCHOOL = 5,
        ADD_PROGRAMS_TO_CLASS = 6,
        ADD_CLASSES_TO_SCHOOL = 7,
    }

}

export class OnboardingRequest extends jspb.Message { 
    getRequestId(): string;
    setRequestId(value: string): OnboardingRequest;
    getAction(): Action;
    setAction(value: Action): OnboardingRequest;

    hasLinkEntities(): boolean;
    clearLinkEntities(): void;
    getLinkEntities(): Link | undefined;
    setLinkEntities(value?: Link): OnboardingRequest;

    hasOrganization(): boolean;
    clearOrganization(): void;
    getOrganization(): Organization | undefined;
    setOrganization(value?: Organization): OnboardingRequest;

    hasSchool(): boolean;
    clearSchool(): void;
    getSchool(): School | undefined;
    setSchool(value?: School): OnboardingRequest;

    hasClass(): boolean;
    clearClass(): void;
    getClass(): Class | undefined;
    setClass(value?: Class): OnboardingRequest;

    hasUser(): boolean;
    clearUser(): void;
    getUser(): User | undefined;
    setUser(value?: User): OnboardingRequest;

    getPayloadCase(): OnboardingRequest.PayloadCase;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): OnboardingRequest.AsObject;
    static toObject(includeInstance: boolean, msg: OnboardingRequest): OnboardingRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: OnboardingRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): OnboardingRequest;
    static deserializeBinaryFromReader(message: OnboardingRequest, reader: jspb.BinaryReader): OnboardingRequest;
}

export namespace OnboardingRequest {
    export type AsObject = {
        requestId: string,
        action: Action,
        linkEntities?: Link.AsObject,
        organization?: Organization.AsObject,
        school?: School.AsObject,
        pb_class?: Class.AsObject,
        user?: User.AsObject,
    }

    export enum PayloadCase {
        PAYLOAD_NOT_SET = 0,
        LINK_ENTITIES = 16,
        ORGANIZATION = 17,
        SCHOOL = 18,
        CLASS = 19,
        USER = 20,
    }

}

export class BatchOnboarding extends jspb.Message { 
    clearRequestsList(): void;
    getRequestsList(): Array<OnboardingRequest>;
    setRequestsList(value: Array<OnboardingRequest>): BatchOnboarding;
    addRequests(value?: OnboardingRequest, index?: number): OnboardingRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): BatchOnboarding.AsObject;
    static toObject(includeInstance: boolean, msg: BatchOnboarding): BatchOnboarding.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: BatchOnboarding, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): BatchOnboarding;
    static deserializeBinaryFromReader(message: BatchOnboarding, reader: jspb.BinaryReader): BatchOnboarding;
}

export namespace BatchOnboarding {
    export type AsObject = {
        requestsList: Array<OnboardingRequest.AsObject>,
    }
}

export class Responses extends jspb.Message { 
    clearResponsesList(): void;
    getResponsesList(): Array<Response>;
    setResponsesList(value: Array<Response>): Responses;
    addResponses(value?: Response, index?: number): Response;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Responses.AsObject;
    static toObject(includeInstance: boolean, msg: Responses): Responses.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Responses, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Responses;
    static deserializeBinaryFromReader(message: Responses, reader: jspb.BinaryReader): Responses;
}

export namespace Responses {
    export type AsObject = {
        responsesList: Array<Response.AsObject>,
    }
}

export class Response extends jspb.Message { 
    getRequestId(): string;
    setRequestId(value: string): Response;
    getEntity(): Entity;
    setEntity(value: Entity): Response;
    getEntityId(): string;
    setEntityId(value: string): Response;
    getSuccess(): boolean;
    setSuccess(value: boolean): Response;

    hasErrors(): boolean;
    clearErrors(): void;
    getErrors(): Error | undefined;
    setErrors(value?: Error): Response;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Response.AsObject;
    static toObject(includeInstance: boolean, msg: Response): Response.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Response, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Response;
    static deserializeBinaryFromReader(message: Response, reader: jspb.BinaryReader): Response;
}

export namespace Response {
    export type AsObject = {
        requestId: string,
        entity: Entity,
        entityId: string,
        success: boolean,
        errors?: Error.AsObject,
    }
}

export class Error extends jspb.Message { 

    hasValidation(): boolean;
    clearValidation(): void;
    getValidation(): ValidationError | undefined;
    setValidation(value?: ValidationError): Error;

    hasRequest(): boolean;
    clearRequest(): void;
    getRequest(): InvalidRequestError | undefined;
    setRequest(value?: InvalidRequestError): Error;

    hasInternalServer(): boolean;
    clearInternalServer(): void;
    getInternalServer(): InternalServerError | undefined;
    setInternalServer(value?: InternalServerError): Error;

    hasEntityExists(): boolean;
    clearEntityExists(): void;
    getEntityExists(): EntityAlreadyExistsError | undefined;
    setEntityExists(value?: EntityAlreadyExistsError): Error;

    hasEntityDoesNotExist(): boolean;
    clearEntityDoesNotExist(): void;
    getEntityDoesNotExist(): EntityDoesNotExistError | undefined;
    setEntityDoesNotExist(value?: EntityDoesNotExistError): Error;

    getErrorTypeCase(): Error.ErrorTypeCase;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Error.AsObject;
    static toObject(includeInstance: boolean, msg: Error): Error.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Error, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Error;
    static deserializeBinaryFromReader(message: Error, reader: jspb.BinaryReader): Error;
}

export namespace Error {
    export type AsObject = {
        validation?: ValidationError.AsObject,
        request?: InvalidRequestError.AsObject,
        internalServer?: InternalServerError.AsObject,
        entityExists?: EntityAlreadyExistsError.AsObject,
        entityDoesNotExist?: EntityDoesNotExistError.AsObject,
    }

    export enum ErrorTypeCase {
        ERROR_TYPE_NOT_SET = 0,
        VALIDATION = 1,
        REQUEST = 2,
        INTERNAL_SERVER = 3,
        ENTITY_EXISTS = 4,
        ENTITY_DOES_NOT_EXIST = 5,
    }

}

export class ValidationError extends jspb.Message { 
    clearErrorsList(): void;
    getErrorsList(): Array<PathBasedError>;
    setErrorsList(value: Array<PathBasedError>): ValidationError;
    addErrors(value?: PathBasedError, index?: number): PathBasedError;
    clearAdditionalDetailsList(): void;
    getAdditionalDetailsList(): Array<string>;
    setAdditionalDetailsList(value: Array<string>): ValidationError;
    addAdditionalDetails(value: string, index?: number): string;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ValidationError.AsObject;
    static toObject(includeInstance: boolean, msg: ValidationError): ValidationError.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ValidationError, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ValidationError;
    static deserializeBinaryFromReader(message: ValidationError, reader: jspb.BinaryReader): ValidationError;
}

export namespace ValidationError {
    export type AsObject = {
        errorsList: Array<PathBasedError.AsObject>,
        additionalDetailsList: Array<string>,
    }
}

export class InternalServerError extends jspb.Message { 
    clearDetailsList(): void;
    getDetailsList(): Array<string>;
    setDetailsList(value: Array<string>): InternalServerError;
    addDetails(value: string, index?: number): string;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): InternalServerError.AsObject;
    static toObject(includeInstance: boolean, msg: InternalServerError): InternalServerError.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: InternalServerError, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): InternalServerError;
    static deserializeBinaryFromReader(message: InternalServerError, reader: jspb.BinaryReader): InternalServerError;
}

export namespace InternalServerError {
    export type AsObject = {
        detailsList: Array<string>,
    }
}

export class EntityAlreadyExistsError extends jspb.Message { 
    clearDetailsList(): void;
    getDetailsList(): Array<string>;
    setDetailsList(value: Array<string>): EntityAlreadyExistsError;
    addDetails(value: string, index?: number): string;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): EntityAlreadyExistsError.AsObject;
    static toObject(includeInstance: boolean, msg: EntityAlreadyExistsError): EntityAlreadyExistsError.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: EntityAlreadyExistsError, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): EntityAlreadyExistsError;
    static deserializeBinaryFromReader(message: EntityAlreadyExistsError, reader: jspb.BinaryReader): EntityAlreadyExistsError;
}

export namespace EntityAlreadyExistsError {
    export type AsObject = {
        detailsList: Array<string>,
    }
}

export class EntityDoesNotExistError extends jspb.Message { 
    clearDetailsList(): void;
    getDetailsList(): Array<string>;
    setDetailsList(value: Array<string>): EntityDoesNotExistError;
    addDetails(value: string, index?: number): string;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): EntityDoesNotExistError.AsObject;
    static toObject(includeInstance: boolean, msg: EntityDoesNotExistError): EntityDoesNotExistError.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: EntityDoesNotExistError, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): EntityDoesNotExistError;
    static deserializeBinaryFromReader(message: EntityDoesNotExistError, reader: jspb.BinaryReader): EntityDoesNotExistError;
}

export namespace EntityDoesNotExistError {
    export type AsObject = {
        detailsList: Array<string>,
    }
}

export class InvalidRequestError extends jspb.Message { 
    clearErrorsList(): void;
    getErrorsList(): Array<PathBasedError>;
    setErrorsList(value: Array<PathBasedError>): InvalidRequestError;
    addErrors(value?: PathBasedError, index?: number): PathBasedError;
    clearAdditionalDetailsList(): void;
    getAdditionalDetailsList(): Array<string>;
    setAdditionalDetailsList(value: Array<string>): InvalidRequestError;
    addAdditionalDetails(value: string, index?: number): string;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): InvalidRequestError.AsObject;
    static toObject(includeInstance: boolean, msg: InvalidRequestError): InvalidRequestError.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: InvalidRequestError, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): InvalidRequestError;
    static deserializeBinaryFromReader(message: InvalidRequestError, reader: jspb.BinaryReader): InvalidRequestError;
}

export namespace InvalidRequestError {
    export type AsObject = {
        errorsList: Array<PathBasedError.AsObject>,
        additionalDetailsList: Array<string>,
    }
}

export class PathBasedError extends jspb.Message { 
    getPath(): string;
    setPath(value: string): PathBasedError;
    clearDetailsList(): void;
    getDetailsList(): Array<string>;
    setDetailsList(value: Array<string>): PathBasedError;
    addDetails(value: string, index?: number): string;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): PathBasedError.AsObject;
    static toObject(includeInstance: boolean, msg: PathBasedError): PathBasedError.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: PathBasedError, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): PathBasedError;
    static deserializeBinaryFromReader(message: PathBasedError, reader: jspb.BinaryReader): PathBasedError;
}

export namespace PathBasedError {
    export type AsObject = {
        path: string,
        detailsList: Array<string>,
    }
}

export enum Gender {
    MALE = 0,
    FEMALE = 1,
}

export enum Entity {
    ORGANIZATION = 0,
    SCHOOL = 1,
    CLASS = 2,
    USER = 3,
    ROLE = 4,
    PROGRAM = 5,
}

export enum Action {
    CREATE = 0,
}
