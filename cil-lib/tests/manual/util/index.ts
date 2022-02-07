import { Metadata } from '@grpc/grpc-js';
import { proto } from '../../../dist/main';
import * as grpc from '@grpc/grpc-js';
import { Responses } from '../../../src/lib/protos';

const { BatchOnboarding, OnboardingClient } = proto;

const client = new OnboardingClient(
  `${process.env.GENERIC_BACKEND_URL}`,
  grpc.ChannelCredentials.createInsecure()
);

export const onboard = async (
  req: proto.BatchOnboarding
): Promise<Responses> => {
  return new Promise((resolve, reject) => {
    const metadata = new Metadata();
    const apiKey = process.env.API_KEY;
    metadata.set('x-api-key', `${apiKey}`);

    client.onboard(req, metadata, (error, response) => {
      if (error !== null) {
        reject(error);
        return;
      }
      resolve(response);
    });
  });
};
