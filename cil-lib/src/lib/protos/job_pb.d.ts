// package: cil_onboarding.jobs
// file: job.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";
import * as api_pb from "./api_pb";

export class Job extends jspb.Message { 
    getRequestId(): string;
    setRequestId(value: string): Job;

    hasRequest(): boolean;
    clearRequest(): void;
    getRequest(): api_pb.OnboardingRequest | undefined;
    setRequest(value?: api_pb.OnboardingRequest): Job;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Job.AsObject;
    static toObject(includeInstance: boolean, msg: Job): Job.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Job, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Job;
    static deserializeBinaryFromReader(message: Job, reader: jspb.BinaryReader): Job;
}

export namespace Job {
    export type AsObject = {
        requestId: string,
        request?: api_pb.OnboardingRequest.AsObject,
    }
}

export class OnboardingSuccess extends jspb.Message { 
    getRequestId(): string;
    setRequestId(value: string): OnboardingSuccess;
    getAction(): api_pb.Action;
    setAction(value: api_pb.Action): OnboardingSuccess;
    getEntity(): api_pb.Entity;
    setEntity(value: api_pb.Entity): OnboardingSuccess;
    getEntityId(): string;
    setEntityId(value: string): OnboardingSuccess;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): OnboardingSuccess.AsObject;
    static toObject(includeInstance: boolean, msg: OnboardingSuccess): OnboardingSuccess.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: OnboardingSuccess, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): OnboardingSuccess;
    static deserializeBinaryFromReader(message: OnboardingSuccess, reader: jspb.BinaryReader): OnboardingSuccess;
}

export namespace OnboardingSuccess {
    export type AsObject = {
        requestId: string,
        action: api_pb.Action,
        entity: api_pb.Entity,
        entityId: string,
    }
}

export class OnboardingError extends jspb.Message { 
    getRequestId(): string;
    setRequestId(value: string): OnboardingError;
    getEntity(): api_pb.Entity;
    setEntity(value: api_pb.Entity): OnboardingError;
    getAction(): api_pb.Action;
    setAction(value: api_pb.Action): OnboardingError;

    hasErrors(): boolean;
    clearErrors(): void;
    getErrors(): api_pb.Error | undefined;
    setErrors(value?: api_pb.Error): OnboardingError;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): OnboardingError.AsObject;
    static toObject(includeInstance: boolean, msg: OnboardingError): OnboardingError.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: OnboardingError, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): OnboardingError;
    static deserializeBinaryFromReader(message: OnboardingError, reader: jspb.BinaryReader): OnboardingError;
}

export namespace OnboardingError {
    export type AsObject = {
        requestId: string,
        entity: api_pb.Entity,
        action: api_pb.Action,
        errors?: api_pb.Error.AsObject,
    }
}
