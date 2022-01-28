export * as proto from './lib/protos';
export * from './lib/errors';
export * from './lib/utils';
export * from './lib/types';
export * from './lib/database';
export * from './lib/services';

export { Prisma, PrismaClient } from '@prisma/client';
export { processOnboardingRequest } from './lib/core';

export * as grpc from '@grpc/grpc-js';
