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

export class EntitiesToLink extends jspb.Message { 
    getEntity(): Entity;
    setEntity(value: Entity): EntitiesToLink;
    clearExternalEntityIdentifiersList(): void;
    getExternalEntityIdentifiersList(): Array<string>;
    setExternalEntityIdentifiersList(value: Array<string>): EntitiesToLink;
    addExternalEntityIdentifiers(value: string, index?: number): string;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): EntitiesToLink.AsObject;
    static toObject(includeInstance: boolean, msg: EntitiesToLink): EntitiesToLink.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: EntitiesToLink, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): EntitiesToLink;
    static deserializeBinaryFromReader(message: EntitiesToLink, reader: jspb.BinaryReader): EntitiesToLink;
}

export namespace EntitiesToLink {
    export type AsObject = {
        entity: Entity,
        externalEntityIdentifiersList: Array<string>,
    }
}

export class LinkEntities extends jspb.Message { 
    getExternalOrganizationUuid(): string;
    setExternalOrganizationUuid(value: string): LinkEntities;

    hasOrganization(): boolean;
    clearOrganization(): void;
    getOrganization(): Organization | undefined;
    setOrganization(value?: Organization): LinkEntities;

    hasSchool(): boolean;
    clearSchool(): void;
    getSchool(): School | undefined;
    setSchool(value?: School): LinkEntities;

    hasClass(): boolean;
    clearClass(): void;
    getClass(): Class | undefined;
    setClass(value?: Class): LinkEntities;

    hasUser(): boolean;
    clearUser(): void;
    getUser(): User | undefined;
    setUser(value?: User): LinkEntities;

    hasEntities(): boolean;
    clearEntities(): void;
    getEntities(): EntitiesToLink | undefined;
    setEntities(value?: EntitiesToLink): LinkEntities;

    getTargetCase(): LinkEntities.TargetCase;

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
        organization?: Organization.AsObject,
        school?: School.AsObject,
        pb_class?: Class.AsObject,
        user?: User.AsObject,
        entities?: EntitiesToLink.AsObject,
    }

    export enum TargetCase {
        TARGET_NOT_SET = 0,
        ORGANIZATION = 3,
        SCHOOL = 4,
        CLASS = 5,
        USER = 6,
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
        linkEntities?: LinkEntities.AsObject,
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
    }

    export enum ErrorTypeCase {
        ERROR_TYPE_NOT_SET = 0,
        VALIDATION = 1,
        REQUEST = 2,
        INTERNAL_SERVER = 3,
        ENTITY_EXISTS = 4,
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
    LINK = 1,
}
