// package: cil_onboarding.events
// file: stream.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";
import * as api_pb from "./api_pb";

export class Event extends jspb.Message { 

    hasData(): boolean;
    clearData(): void;
    getData(): api_pb.OnboardingRequest | undefined;
    setData(value?: api_pb.OnboardingRequest): Event;
    getRetries(): number;
    setRetries(value: number): Event;
    getRequestId(): string;
    setRequestId(value: string): Event;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Event.AsObject;
    static toObject(includeInstance: boolean, msg: Event): Event.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Event, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Event;
    static deserializeBinaryFromReader(message: Event, reader: jspb.BinaryReader): Event;
}

export namespace Event {
    export type AsObject = {
        data?: api_pb.OnboardingRequest.AsObject,
        retries: number,
        requestId: string,
    }
}
