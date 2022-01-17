// package: cil_onboarding.api
// file: api.proto

/* tslint:disable */
/* eslint-disable */

import * as grpc from "@grpc/grpc-js";
import * as api_pb from "./api_pb";

interface IOnboardingService extends grpc.ServiceDefinition<grpc.UntypedServiceImplementation> {
    onboard: IOnboardingService_IOnboard;
    onboardStream: IOnboardingService_IOnboardStream;
}

interface IOnboardingService_IOnboard extends grpc.MethodDefinition<api_pb.BatchOnboarding, api_pb.Responses> {
    path: "/cil_onboarding.api.Onboarding/Onboard";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<api_pb.BatchOnboarding>;
    requestDeserialize: grpc.deserialize<api_pb.BatchOnboarding>;
    responseSerialize: grpc.serialize<api_pb.Responses>;
    responseDeserialize: grpc.deserialize<api_pb.Responses>;
}
interface IOnboardingService_IOnboardStream extends grpc.MethodDefinition<api_pb.BatchOnboarding, api_pb.Response> {
    path: "/cil_onboarding.api.Onboarding/OnboardStream";
    requestStream: true;
    responseStream: true;
    requestSerialize: grpc.serialize<api_pb.BatchOnboarding>;
    requestDeserialize: grpc.deserialize<api_pb.BatchOnboarding>;
    responseSerialize: grpc.serialize<api_pb.Response>;
    responseDeserialize: grpc.deserialize<api_pb.Response>;
}

export const OnboardingService: IOnboardingService;

export interface IOnboardingServer extends grpc.UntypedServiceImplementation {
    onboard: grpc.handleUnaryCall<api_pb.BatchOnboarding, api_pb.Responses>;
    onboardStream: grpc.handleBidiStreamingCall<api_pb.BatchOnboarding, api_pb.Response>;
}

export interface IOnboardingClient {
    onboard(request: api_pb.BatchOnboarding, callback: (error: grpc.ServiceError | null, response: api_pb.Responses) => void): grpc.ClientUnaryCall;
    onboard(request: api_pb.BatchOnboarding, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: api_pb.Responses) => void): grpc.ClientUnaryCall;
    onboard(request: api_pb.BatchOnboarding, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: api_pb.Responses) => void): grpc.ClientUnaryCall;
    onboardStream(): grpc.ClientDuplexStream<api_pb.BatchOnboarding, api_pb.Response>;
    onboardStream(options: Partial<grpc.CallOptions>): grpc.ClientDuplexStream<api_pb.BatchOnboarding, api_pb.Response>;
    onboardStream(metadata: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientDuplexStream<api_pb.BatchOnboarding, api_pb.Response>;
}

export class OnboardingClient extends grpc.Client implements IOnboardingClient {
    constructor(address: string, credentials: grpc.ChannelCredentials, options?: Partial<grpc.ClientOptions>);
    public onboard(request: api_pb.BatchOnboarding, callback: (error: grpc.ServiceError | null, response: api_pb.Responses) => void): grpc.ClientUnaryCall;
    public onboard(request: api_pb.BatchOnboarding, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: api_pb.Responses) => void): grpc.ClientUnaryCall;
    public onboard(request: api_pb.BatchOnboarding, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: api_pb.Responses) => void): grpc.ClientUnaryCall;
    public onboardStream(options?: Partial<grpc.CallOptions>): grpc.ClientDuplexStream<api_pb.BatchOnboarding, api_pb.Response>;
    public onboardStream(metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientDuplexStream<api_pb.BatchOnboarding, api_pb.Response>;
}
