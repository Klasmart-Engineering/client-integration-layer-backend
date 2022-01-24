import * as grpc from '@grpc/grpc-js';
import { Metadata } from '@grpc/grpc-js';
import { v4 as uuidv4 } from 'uuid';

import {
  Action,
  BatchOnboarding,
  OnboardingClient,
  OnboardingRequest,
  Organization,
} from '../../src/lib/protos';

const client = new OnboardingClient(
  '0.0.0.0:4200',
  grpc.ChannelCredentials.createInsecure()
);

const org = new Organization()
  .setExternalUuid(uuidv4())
  .setName('My Organization Name');

const req = new OnboardingRequest()
  .setRequestId(uuidv4())
  .setAction(Action.CREATE)
  .setOrganization(org);

const onboard = async (reqs: OnboardingRequest[]) => {
  return new Promise((resolve, reject) => {
    const req = new BatchOnboarding().setRequestsList(reqs);
    const metadata = new Metadata();
    metadata.set('x-api-key', '75b19ff4957d47b0b843a753b01b6b29');

    console.log('About to send requests');

    client.onboard(req, metadata, (error, response) => {
      if (error !== null) {
        console.error('Received Error\n', error);
        reject(error);
        return;
      }
      console.log('Received response\n', response);
      resolve(response);
    });
  });
};

async function main() {
  await onboard([req]);
}

main().catch((e) => console.error('Had error when running main', e));
