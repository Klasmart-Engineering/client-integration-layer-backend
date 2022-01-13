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
import {
  log,
  MachineError,
  OnboardingError,
  processMessage,
  proto,
} from 'cil-lib';

export class OnboardingServer implements proto.IOnboardingServer {
  [name: string]: import('@grpc/grpc-js').UntypedHandleCall;

  public async onboardSingle(
    call: ServerUnaryCall<proto.OnboardingRequest, proto.RequestInformation>,
    callback: sendUnaryData<proto.RequestInformation>
  ): Promise<void> {
    const data = call.request;
    try {
      const resp = await processMessage(data);
      callback(null, resp);
    } catch (e) {
      const error = new StatusBuilder();
      if (e instanceof OnboardingError && e.error === MachineError.VALIDATION) {
        error.withCode(Status.INVALID_ARGUMENT);
        const msg = { msg: e.msg };
        if (e.details.length > 0) {
          msg['details'] = e.details;
        }
        error.withDetails(JSON.stringify(msg));
      } else {
        error.withCode(Status.INTERNAL);
        error.withDetails(JSON.stringify({ msg: 'Internal Server Error' }));
      }
      callback(error.build());
    }
  }

  public async onboardMultiple(
    call: ServerDuplexStream<proto.OnboardingRequest, proto.RequestInformation>
  ): Promise<void> {
    call.on('data', async (req: proto.OnboardingRequest) => {
      const resp = await processMessage(req);
      call.write(resp);
    });
    call.on('error', (e) => {
      const error = new StatusBuilder();
      if (e instanceof OnboardingError && e.error === MachineError.VALIDATION) {
        error.withCode(Status.INVALID_ARGUMENT);
        const msg = { msg: e.msg };
        if (e.details.length > 0) {
          msg['details'] = e.details;
        }
        error.withDetails(JSON.stringify(msg));
      } else {
        error.withCode(Status.INTERNAL);
        error.withDetails(JSON.stringify({ msg: 'Internal Server Error' }));
      }
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
        throw err;
      }
      log.info(`Starting up server, listening on port ${port}`);
      server.start();
    }
  );
}
