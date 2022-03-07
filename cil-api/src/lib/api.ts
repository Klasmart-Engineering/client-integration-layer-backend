import {
  sendUnaryData,
  Server,
  ServerCredentials,
  ServerDuplexStream,
  ServerUnaryCall,
  StatusBuilder,
  StatusObject,
} from '@grpc/grpc-js';
import { Status } from '@grpc/grpc-js/build/src/constants';
import { Context, log, Logger, processOnboardingRequest, proto } from 'cil-lib';

const logger = log.child({ api: 'cil-api' });

export class OnboardingServer implements proto.IOnboardingServer {
  [name: string]: import('@grpc/grpc-js').UntypedHandleCall;

  public async onboard(
    call: ServerUnaryCall<proto.BatchOnboarding, proto.Responses>,
    callback: sendUnaryData<proto.Responses>
  ): Promise<void> {
    const apiKey = call.metadata.get('x-api-key');
    if (apiKey.length !== 1 || apiKey[0] !== process.env.API_KEY) {
      const error = new StatusBuilder();
      error.withCode(Status.UNAUTHENTICATED);
      error.withDetails('Unauthorized');
      callback(error.build());
      return;
    }

    try {
      const resp = await processOnboardingRequest(call.request, log);
      callback(null, resp);
    } catch (error) {
      logger.error(`There is an error which should be caught earlier`);
      const e = new StatusBuilder();
      e.withCode(Status.INTERNAL);
      e.withDetails(
        `The app got unexpected error. Please contact someone from the team`
      );
      callback(e.build());
    }
  }

  public async onboardStream(
    call: ServerDuplexStream<proto.BatchOnboarding, proto.Responses>
  ): Promise<void> {
    const apiKey = call.metadata.get('x-api-key');
    if (apiKey.length !== 1 || apiKey[0] !== process.env.API_KEY) {
      const error = new StatusBuilder();
      error.withCode(Status.UNAUTHENTICATED);
      error.withDetails('Unauthorized');
      call.write(null, null, (cb: (err: Partial<StatusObject>) => void) =>
        cb(error.build())
      );
      call.end();
    }

    call.on('data', async (req: proto.BatchOnboarding) => {
      const resp = await processOnboardingRequest(req, log);
      call.write(resp);
    });
    call.on('error', (_) => {
      const error = new StatusBuilder();
      error.withCode(Status.INTERNAL);
      error.withDetails('Internal Server Error');
      call.write(null, null, (cb: (err: Partial<StatusObject>) => void) =>
        cb(error.build())
      );
    });
    call.on('end', () => call.end());
  }
}

export async function serve(log: Logger = logger): Promise<Server> {
  await Context.getInstance(true, log);
  // This is to initialize system roles & programs
  const server = new Server();
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  server.addService(proto.OnboardingService, new OnboardingServer());
  server.bindAsync(
    `0.0.0.0:${process.env.PORT || 8080}`,
    ServerCredentials.createInsecure(),
    (err, port) => {
      if (err) {
        log.error({ error: err }, 'Found error when starting up server');
        throw err;
      }
      logger.info(`Starting up server, listening on port ${port}`);
      server.start();
    }
  );
  return server;
}
