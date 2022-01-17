// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('@grpc/grpc-js');
var api_pb = require('./api_pb.js');

function serialize_cil_onboarding_api_BatchOnboarding(arg) {
  if (!(arg instanceof api_pb.BatchOnboarding)) {
    throw new Error('Expected argument of type cil_onboarding.api.BatchOnboarding');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_cil_onboarding_api_BatchOnboarding(buffer_arg) {
  return api_pb.BatchOnboarding.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_cil_onboarding_api_Response(arg) {
  if (!(arg instanceof api_pb.Response)) {
    throw new Error('Expected argument of type cil_onboarding.api.Response');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_cil_onboarding_api_Response(buffer_arg) {
  return api_pb.Response.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_cil_onboarding_api_Responses(arg) {
  if (!(arg instanceof api_pb.Responses)) {
    throw new Error('Expected argument of type cil_onboarding.api.Responses');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_cil_onboarding_api_Responses(buffer_arg) {
  return api_pb.Responses.deserializeBinary(new Uint8Array(buffer_arg));
}


var OnboardingService = exports.OnboardingService = {
  onboard: {
    path: '/cil_onboarding.api.Onboarding/Onboard',
    requestStream: false,
    responseStream: false,
    requestType: api_pb.BatchOnboarding,
    responseType: api_pb.Responses,
    requestSerialize: serialize_cil_onboarding_api_BatchOnboarding,
    requestDeserialize: deserialize_cil_onboarding_api_BatchOnboarding,
    responseSerialize: serialize_cil_onboarding_api_Responses,
    responseDeserialize: deserialize_cil_onboarding_api_Responses,
  },
  onboardStream: {
    path: '/cil_onboarding.api.Onboarding/OnboardStream',
    requestStream: true,
    responseStream: true,
    requestType: api_pb.BatchOnboarding,
    responseType: api_pb.Response,
    requestSerialize: serialize_cil_onboarding_api_BatchOnboarding,
    requestDeserialize: deserialize_cil_onboarding_api_BatchOnboarding,
    responseSerialize: serialize_cil_onboarding_api_Response,
    responseDeserialize: deserialize_cil_onboarding_api_Response,
  },
};

exports.OnboardingClient = grpc.makeGenericClientConstructor(OnboardingService);
