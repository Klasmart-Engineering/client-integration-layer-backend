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
    getExternalSchoolUuid(): string;
    setExternalSchoolUuid(value: string): User;
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
        externalSchoolUuid: string,
        email: string,
        phone: string,
        username: string,
        givenName: string,
        familyName: string,
        gender: Gender,
        dateOfBirth: string,
    }
}

export class EntityInformation extends jspb.Message { 
    getEntity(): Entity;
    setEntity(value: Entity): EntityInformation;
    getExternalEntityIdentifier(): string;
    setExternalEntityIdentifier(value: string): EntityInformation;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): EntityInformation.AsObject;
    static toObject(includeInstance: boolean, msg: EntityInformation): EntityInformation.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: EntityInformation, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): EntityInformation;
    static deserializeBinaryFromReader(message: EntityInformation, reader: jspb.BinaryReader): EntityInformation;
}

export namespace EntityInformation {
    export type AsObject = {
        entity: Entity,
        externalEntityIdentifier: string,
    }
}

export class Entities extends jspb.Message { 
    clearEntitiesList(): void;
    getEntitiesList(): Array<EntityInformation>;
    setEntitiesList(value: Array<EntityInformation>): Entities;
    addEntities(value?: EntityInformation, index?: number): EntityInformation;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Entities.AsObject;
    static toObject(includeInstance: boolean, msg: Entities): Entities.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Entities, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Entities;
    static deserializeBinaryFromReader(message: Entities, reader: jspb.BinaryReader): Entities;
}

export namespace Entities {
    export type AsObject = {
        entitiesList: Array<EntityInformation.AsObject>,
    }
}

export class LinkEntities extends jspb.Message { 
    getExternalOrganizationUuid(): string;
    setExternalOrganizationUuid(value: string): LinkEntities;

    hasEntity1(): boolean;
    clearEntity1(): void;
    getEntity1(): EntityInformation | undefined;
    setEntity1(value?: EntityInformation): LinkEntities;

    hasEntity2(): boolean;
    clearEntity2(): void;
    getEntity2(): EntityInformation | undefined;
    setEntity2(value?: EntityInformation): LinkEntities;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): LinkEntities.AsObject;
    static toObject(includeInstance: boolean, msg: LinkEntities): LinkEntities.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: LinkEntities, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): LinkEntities;
    static deserializeBinaryFromReader(message: LinkEntities, reader: jspb.BinaryReader): LinkEntities;
}

export namespace LinkEntities {
    export type AsObject = {
        externalOrganizationUuid: string,
        entity1?: EntityInformation.AsObject,
        entity2?: EntityInformation.AsObject,
    }
}

export class OnboardingRequest extends jspb.Message { 
    getRequestId(): string;
    setRequestId(value: string): OnboardingRequest;
    getAction(): Action;
    setAction(value: Action): OnboardingRequest;

    hasLinkEntities(): boolean;
    clearLinkEntities(): void;
    getLinkEntities(): LinkEntities | undefined;
    setLinkEntities(value?: LinkEntities): OnboardingRequest;

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

    getEntityCase(): OnboardingRequest.EntityCase;

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
        linkEntities?: LinkEntities.AsObject,
        organization?: Organization.AsObject,
        school?: School.AsObject,
        pb_class?: Class.AsObject,
        user?: User.AsObject,
    }

    export enum EntityCase {
        ENTITY_NOT_SET = 0,
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

    hasInternalServer(): boolean;
    clearInternalServer(): void;
    getInternalServer(): InternalServerError | undefined;
    setInternalServer(value?: InternalServerError): Error;

    hasEntityExists(): boolean;
    clearEntityExists(): void;
    getEntityExists(): EntityAlreadyExistsError | undefined;
    setEntityExists(value?: EntityAlreadyExistsError): Error;

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
        internalServer?: InternalServerError.AsObject,
        entityExists?: EntityAlreadyExistsError.AsObject,
    }

    export enum ErrorTypeCase {
        ERROR_TYPE_NOT_SET = 0,
        VALIDATION = 1,
        INTERNAL_SERVER = 2,
        ENTITY_EXISTS = 3,
    }

}

export class ValidationError extends jspb.Message { 
    getPath(): string;
    setPath(value: string): ValidationError;
    clearDetailsList(): void;
    getDetailsList(): Array<string>;
    setDetailsList(value: Array<string>): ValidationError;
    addDetails(value: string, index?: number): string;

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
        path: string,
        detailsList: Array<string>,
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
