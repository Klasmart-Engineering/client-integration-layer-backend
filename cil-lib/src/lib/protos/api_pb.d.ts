// package: cil_onboarding
// file: api.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";

export class Organization extends jspb.Message { 
    getClientUuid(): string;
    setClientUuid(value: string): Organization;
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
        clientUuid: string,
        name: string,
    }
}

export class School extends jspb.Message { 
    getClientUuid(): string;
    setClientUuid(value: string): School;
    getClientOrganizationUuid(): string;
    setClientOrganizationUuid(value: string): School;
    getName(): string;
    setName(value: string): School;
    clearProgramIdsList(): void;
    getProgramIdsList(): Array<string>;
    setProgramIdsList(value: Array<string>): School;
    addProgramIds(value: string, index?: number): string;
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
        clientUuid: string,
        clientOrganizationUuid: string,
        name: string,
        programIdsList: Array<string>,
        shortCode: string,
    }
}

export class Class extends jspb.Message { 
    getClientUuid(): string;
    setClientUuid(value: string): Class;
    getClientOrganizationUuid(): string;
    setClientOrganizationUuid(value: string): Class;
    getName(): string;
    setName(value: string): Class;
    getClientSchoolUuid(): string;
    setClientSchoolUuid(value: string): Class;
    clearProgramIdsList(): void;
    getProgramIdsList(): Array<string>;
    setProgramIdsList(value: Array<string>): Class;
    addProgramIds(value: string, index?: number): string;
    getShortCode(): string;
    setShortCode(value: string): Class;

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
        clientUuid: string,
        clientOrganizationUuid: string,
        name: string,
        clientSchoolUuid: string,
        programIdsList: Array<string>,
        shortCode: string,
    }
}

export class User extends jspb.Message { 
    getClientUuid(): string;
    setClientUuid(value: string): User;
    getClientOrganizationUuid(): string;
    setClientOrganizationUuid(value: string): User;
    getClientSchoolUuid(): string;
    setClientSchoolUuid(value: string): User;
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
    clearClassIdsList(): void;
    getClassIdsList(): Array<string>;
    setClassIdsList(value: Array<string>): User;
    addClassIds(value: string, index?: number): string;
    clearRoleIdsList(): void;
    getRoleIdsList(): Array<string>;
    setRoleIdsList(value: Array<string>): User;
    addRoleIds(value: string, index?: number): string;

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
        clientUuid: string,
        clientOrganizationUuid: string,
        clientSchoolUuid: string,
        email: string,
        phone: string,
        username: string,
        givenName: string,
        familyName: string,
        gender: Gender,
        dateOfBirth: string,
        classIdsList: Array<string>,
        roleIdsList: Array<string>,
    }
}

export class OnboardingRequest extends jspb.Message { 

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
    getRequestId(): string;
    setRequestId(value: string): OnboardingRequest;

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
        organization?: Organization.AsObject,
        school?: School.AsObject,
        pb_class?: Class.AsObject,
        user?: User.AsObject,
        requestId: string,
    }

    export enum EntityCase {
        ENTITY_NOT_SET = 0,
        ORGANIZATION = 1,
        SCHOOL = 2,
        CLASS = 3,
        USER = 4,
    }

}

export class RequestInformation extends jspb.Message { 
    getRequestId(): string;
    setRequestId(value: string): RequestInformation;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): RequestInformation.AsObject;
    static toObject(includeInstance: boolean, msg: RequestInformation): RequestInformation.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: RequestInformation, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): RequestInformation;
    static deserializeBinaryFromReader(message: RequestInformation, reader: jspb.BinaryReader): RequestInformation;
}

export namespace RequestInformation {
    export type AsObject = {
        requestId: string,
    }
}

export enum Gender {
    MALE = 0,
    FEMALE = 1,
}
