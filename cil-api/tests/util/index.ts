import { proto, grpc, Logger } from 'cil-lib';
import sinon from 'sinon';

export { populateAdminService } from './populateAdminService';

export const onboard = async (
  req: proto.BatchOnboarding,
  client: proto.OnboardingClient
): Promise<proto.Responses> => {
  return new Promise((resolve, reject) => {
    const metadata = new grpc.Metadata();
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

export const LOG_STUB: Logger = {
  error: sinon.fake(),
  warn: sinon.fake(),
  info: sinon.fake(),
  debug: sinon.fake(),
  trace: sinon.fake(),
  child: sinon.fake(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any as Logger;

// @ts-ignore
LOG_STUB.child = () => LOG_STUB as any as Logger;
