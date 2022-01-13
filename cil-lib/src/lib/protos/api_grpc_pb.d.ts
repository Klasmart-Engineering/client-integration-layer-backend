// package: cil_onboarding
// file: api.proto

/* tslint:disable */
/* eslint-disable */

import * as grpc from '@grpc/grpc-js';
import * as api_pb from './api_pb';

interface IOnboardingService
  extends grpc.ServiceDefinition<grpc.UntypedServiceImplementation> {
  onboardSingle: IOnboardingService_IOnboardSingle;
  onboardMultiple: IOnboardingService_IOnboardMultiple;
}

interface IOnboardingService_IOnboardSingle
  extends grpc.MethodDefinition<
    api_pb.OnboardingRequest,
    api_pb.RequestInformation
  > {
  path: '/cil_onboarding.Onboarding/OnboardSingle';
  requestStream: false;
  responseStream: false;
  requestSerialize: grpc.serialize<api_pb.OnboardingRequest>;
  requestDeserialize: grpc.deserialize<api_pb.OnboardingRequest>;
  responseSerialize: grpc.serialize<api_pb.RequestInformation>;
  responseDeserialize: grpc.deserialize<api_pb.RequestInformation>;
}
interface IOnboardingService_IOnboardMultiple
  extends grpc.MethodDefinition<
    api_pb.OnboardingRequest,
    api_pb.RequestInformation
  > {
  path: '/cil_onboarding.Onboarding/OnboardMultiple';
  requestStream: true;
  responseStream: true;
  requestSerialize: grpc.serialize<api_pb.OnboardingRequest>;
  requestDeserialize: grpc.deserialize<api_pb.OnboardingRequest>;
  responseSerialize: grpc.serialize<api_pb.RequestInformation>;
  responseDeserialize: grpc.deserialize<api_pb.RequestInformation>;
}

export const OnboardingService: IOnboardingService;

export interface IOnboardingServer extends grpc.UntypedServiceImplementation {
  onboardSingle: grpc.handleUnaryCall<
    api_pb.OnboardingRequest,
    api_pb.RequestInformation
  >;
  onboardMultiple: grpc.handleBidiStreamingCall<
    api_pb.OnboardingRequest,
    api_pb.RequestInformation
  >;
}

export interface IOnboardingClient {
  onboardSingle(
    request: api_pb.OnboardingRequest,
    callback: (
      error: grpc.ServiceError | null,
      response: api_pb.RequestInformation
    ) => void
  ): grpc.ClientUnaryCall;
  onboardSingle(
    request: api_pb.OnboardingRequest,
    metadata: grpc.Metadata,
    callback: (
      error: grpc.ServiceError | null,
      response: api_pb.RequestInformation
    ) => void
  ): grpc.ClientUnaryCall;
  onboardSingle(
    request: api_pb.OnboardingRequest,
    metadata: grpc.Metadata,
    options: Partial<grpc.CallOptions>,
    callback: (
      error: grpc.ServiceError | null,
      response: api_pb.RequestInformation
    ) => void
  ): grpc.ClientUnaryCall;
  onboardMultiple(): grpc.ClientDuplexStream<
    api_pb.OnboardingRequest,
    api_pb.RequestInformation
  >;
  onboardMultiple(
    options: Partial<grpc.CallOptions>
  ): grpc.ClientDuplexStream<
    api_pb.OnboardingRequest,
    api_pb.RequestInformation
  >;
  onboardMultiple(
    metadata: grpc.Metadata,
    options?: Partial<grpc.CallOptions>
  ): grpc.ClientDuplexStream<
    api_pb.OnboardingRequest,
    api_pb.RequestInformation
  >;
}

export class OnboardingClient extends grpc.Client implements IOnboardingClient {
  constructor(
    address: string,
    credentials: grpc.ChannelCredentials,
    options?: Partial<grpc.ClientOptions>
  );
  public onboardSingle(
    request: api_pb.OnboardingRequest,
    callback: (
      error: grpc.ServiceError | null,
      response: api_pb.RequestInformation
    ) => void
  ): grpc.ClientUnaryCall;
  public onboardSingle(
    request: api_pb.OnboardingRequest,
    metadata: grpc.Metadata,
    callback: (
      error: grpc.ServiceError | null,
      response: api_pb.RequestInformation
    ) => void
  ): grpc.ClientUnaryCall;
  public onboardSingle(
    request: api_pb.OnboardingRequest,
    metadata: grpc.Metadata,
    options: Partial<grpc.CallOptions>,
    callback: (
      error: grpc.ServiceError | null,
      response: api_pb.RequestInformation
    ) => void
  ): grpc.ClientUnaryCall;
  public onboardMultiple(
    options?: Partial<grpc.CallOptions>
  ): grpc.ClientDuplexStream<
    api_pb.OnboardingRequest,
    api_pb.RequestInformation
  >;
  public onboardMultiple(
    metadata?: grpc.Metadata,
    options?: Partial<grpc.CallOptions>
  ): grpc.ClientDuplexStream<
    api_pb.OnboardingRequest,
    api_pb.RequestInformation
  >;
}
