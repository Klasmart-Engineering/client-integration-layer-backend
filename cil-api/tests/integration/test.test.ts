import { proto, grpc } from 'cil-lib';
import { v4 as uuidv4 } from 'uuid';
import { expect } from 'chai';
import { OnboardingServer } from '../../src/lib/api';
import { onboard } from '../util';

const {
  OnboardingClient,
  BatchOnboarding,
  RequestMetadata,
  Action,
  School,
  OnboardingRequest,
} = proto;

describe('attempt at integration test', () => {
  let server: grpc.Server;
  let client: proto.OnboardingClient;

  before((done) => {
    server = new grpc.Server();
    server.addService(proto.OnboardingService, new OnboardingServer());

    server.bindAsync(
      'localhost:0',
      grpc.ServerCredentials.createInsecure(),
      (err, port) => {
        expect(err).to.be.null;
        client = new OnboardingClient(
          `localhost:${port}`,
          grpc.credentials.createInsecure()
        );
        server.start();
        done();
      }
    );
  });

  after((done) => {
    if (client) client.close();
    server.tryShutdown(done);
  });

  it('should perform a test', async () => {
    const requestMetadata = new RequestMetadata().setId(uuidv4()).setN('1');
    const school = new School().setName('Test School');

    const req = new OnboardingRequest()
      .setRequestId(requestMetadata)
      .setAction(Action.CREATE)
      .setSchool(school);
    const reqs = new BatchOnboarding().setRequestsList([req]);
    const result = await onboard(reqs, client);
    console.log(result.toObject());
  });
}).timeout(10000);
