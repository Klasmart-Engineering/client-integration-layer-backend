import { v4 as uuidv4 } from 'uuid';
import { proto, grpc, Logger, PrismaClient, ExternalUuid } from 'cil-lib';
import sinon from 'sinon';

export { populateAdminService } from './populateAdminService';

const prisma = new PrismaClient();

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

export function random(): string {
  return (Math.random() + 1).toString(36).substring(7);
}

export function wrapRequest(
  requests: proto.OnboardingRequest[]
): proto.BatchOnboarding {
  requests.forEach((request) => {
    request
      .setRequestId(new proto.RequestMetadata().setId(uuidv4()).setN(uuidv4()))
      .setAction(proto.Action.CREATE);
  });

  return new proto.BatchOnboarding().setRequestsList(requests);
}

export async function getDbProgram(
  name: string,
  externalOrgUuid: ExternalUuid
) {
  const program = await prisma.program.findFirst({
    where: { name: { equals: name }, externalOrgUuid },
    select: { name: true, externalOrgUuid: true },
  });

  return program;
}

export async function getDbRole(name: string, externalOrgUuid: ExternalUuid) {
  const program = await prisma.role.findFirst({
    where: { name: { equals: name }, externalOrgUuid },
    select: { name: true, externalOrgUuid: true },
  });

  return program;
}
