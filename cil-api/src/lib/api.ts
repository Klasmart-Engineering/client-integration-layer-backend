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
import { log, processMessage, proto } from 'cil-lib';

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
    }

    const resp = new proto.Responses();
    const results = [];
    for (const req of call.request.getRequestsList()) {
      try {
        const resp = await processMessage(req, logger);
        results.push(resp);
      } catch (e) {
        const error = new StatusBuilder();
        error.withCode(Status.INTERNAL);
        error.withDetails('Internal Server Error');
        callback(error.build());
      }
    }
    resp.setResponsesList(results);
    callback(null, resp);
  }

  public async onboardStream(
    call: ServerDuplexStream<proto.BatchOnboarding, proto.Response>
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
      for (const data of req.getRequestsList()) {
        const resp = await processMessage(data, logger);
        call.write(resp);
      }
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

export function serve(): void {
  const server = new Server();
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  server.addService(proto.OnboardingService, new OnboardingServer());
  server.bindAsync(
    `localhost:${process.env.PORT || 8080}`,
    ServerCredentials.createInsecure(),
    (err, port) => {
      if (err) {
        logger.error({ error: err }, 'Found error when starting up server');
        throw err;
      }
      logger.info(`Starting up server, listening on port ${port}`);
      server.start();
    }
  );
}
