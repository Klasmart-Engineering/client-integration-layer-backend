import { Context, grpc, PrismaClient, proto } from 'cil-lib';
import { OnboardingClient } from 'cil-lib/dist/main/lib/protos';
import { OnboardingServer } from '../src/lib/api';

const { execSync } = require('child_process');
const path = require('path');

export function prismaTestContext() {
  const PATH = `PATH=${process.env.PATH}`;

  const prismaBinary = path.join(
    __dirname,
    '..',
    'node_modules',
    '.bin',
    'prisma'
  );

  // Generate a unique database for this test context
  global.process.env.DATABASE_URL =
    'postgresql://postgres:kidsloop@localhost:5432/cil-validation-test';

  const test_db = 'cil-validation-test';

  const schemaFilePath = path.join(
    __dirname,
    '..',
    '..',
    'cil-lib',
    'prisma',
    'schema.prisma'
  );

  let prismaClient: null | PrismaClient = null;

  return {
    async before() {
      await prismaClient?.$disconnect();
      // Run the migrations to ensure our schema has the required structure

      execSync(`${PATH} ${prismaBinary} db push --schema=${schemaFilePath}`, {
        env: { DATABASE_URL: global.process.env.DATABASE_URL },
      });
      console.log('Creating database: ', global.process.env.DATABASE_URL);
      // Construct a new Prisma Client connected to the generated schema
      prismaClient = new PrismaClient();
      await prismaClient.$connect();
      return prismaClient;
    },
    async after() {
      // Drop the schema after the tests have completed
      //await prismaClient.$executeRaw`DROP DATABASE IF EXISTS "${test_db}"`;
      execSync(
        `${PATH} ${prismaBinary} db push --force-reset --schema=${schemaFilePath}`,
        {
          env: { DATABASE_URL: global.process.env.DATABASE_URL },
        }
      );
      console.log('Cleaning database...', test_db);
      // Release the Prisma Client connection
      await prismaClient.$disconnect();
    },
  };
}
export function grpcTestContext() {
  let server: grpc.Server;
  let client: proto.OnboardingClient;

  return {
    async before() {
      return new Promise<OnboardingClient>((resolve, reject) => {
        Context.getInstance(true);
        server = new grpc.Server();
        server.addService(proto.OnboardingService, new OnboardingServer());

        server.bindAsync(
          'localhost:0',
          grpc.ServerCredentials.createInsecure(),

          (err, port) => {
            if (err) {
              reject(err);
            }
            client = new OnboardingClient(
              `localhost:${port}`,
              grpc.credentials.createInsecure()
            );
            server.start();
            resolve(client);
          }
        );
      });
    },
    after(done) {
      if (client) client.close();
      server.tryShutdown(done);
    },
  };
}
