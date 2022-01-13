// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('@grpc/grpc-js');
var api_pb = require('./api_pb.js');

function serialize_cil_onboarding_OnboardingRequest(arg) {
  if (!(arg instanceof api_pb.OnboardingRequest)) {
    throw new Error('Expected argument of type cil_onboarding.OnboardingRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_cil_onboarding_OnboardingRequest(buffer_arg) {
  return api_pb.OnboardingRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_cil_onboarding_RequestInformation(arg) {
  if (!(arg instanceof api_pb.RequestInformation)) {
    throw new Error('Expected argument of type cil_onboarding.RequestInformation');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_cil_onboarding_RequestInformation(buffer_arg) {
  return api_pb.RequestInformation.deserializeBinary(new Uint8Array(buffer_arg));
}


var OnboardingService = exports.OnboardingService = {
  onboardSingle: {
    path: '/cil_onboarding.Onboarding/OnboardSingle',
    requestStream: false,
    responseStream: false,
    requestType: api_pb.OnboardingRequest,
    responseType: api_pb.RequestInformation,
    requestSerialize: serialize_cil_onboarding_OnboardingRequest,
    requestDeserialize: deserialize_cil_onboarding_OnboardingRequest,
    responseSerialize: serialize_cil_onboarding_RequestInformation,
    responseDeserialize: deserialize_cil_onboarding_RequestInformation,
  },
  onboardMultiple: {
    path: '/cil_onboarding.Onboarding/OnboardMultiple',
    requestStream: true,
    responseStream: true,
    requestType: api_pb.OnboardingRequest,
    responseType: api_pb.RequestInformation,
    requestSerialize: serialize_cil_onboarding_OnboardingRequest,
    requestDeserialize: deserialize_cil_onboarding_OnboardingRequest,
    responseSerialize: serialize_cil_onboarding_RequestInformation,
    responseDeserialize: deserialize_cil_onboarding_RequestInformation,
  },
};

exports.OnboardingClient = grpc.makeGenericClientConstructor(OnboardingService);
