import { v4 as uuidv4 } from 'uuid';
import { Context, grpc, PrismaClient, proto } from 'cil-lib';
import { OnboardingClient } from 'cil-lib/dist/main/lib/protos';
import { OnboardingServer } from '../src/lib/api';

const { execSync } = require('child_process');
const path = require('path');

const dbUrl = process.env.DATABASE_URL;

export function prismaTestContext() {
  const PATH = `PATH=${process.env.PATH}`;

  const prismaBinary = path.join(
    __dirname,
    '..',
    'node_modules',
    '.bin',
    'prisma'
  );

  const schemaFilePath = path.join(
    __dirname,
    '..',
    '..',
    'cil-lib',
    'prisma',
    'schema.prisma'
  );

  return {
    async before() {
      // store global prisma instance
      await global.prisma?.$disconnect();

      // global variable to check if a test database has been created
      if (global.isTestDbCreated == undefined) {
        // global database name
        global.testDb = `test-${uuidv4()}`;
        // global counter that keeps track of how many test files are running
        global.counter = 1;

        const splitDatabase = dbUrl.split('/');
        const withoutDatabase = splitDatabase.splice(
          0,
          splitDatabase.length - 1
        );
        const withDatabase = withoutDatabase;

        withDatabase.push(global.testDb);

        const databaseUrl = withDatabase.join('/');
        global.process.env.DATABASE_URL = `${databaseUrl}?schema=public`;

        // Run the migrations to ensure our schema has the required structure
        execSync(`${PATH} ${prismaBinary} db push --schema=${schemaFilePath}`, {
          env: { DATABASE_URL: global.process.env.DATABASE_URL },
        });
        global.isTestDbCreated = true;
        // Get prisma connected to the generated database
        global.prisma = new PrismaClient();
        await global.prisma.$connect();
      } else {
        // Increase the counter to take account for the current test file
        global.counter += 1;
      }

      return global.prisma;
    },
    async after() {
      // Check if the test file is the last one. If true then clean up the database
      if (global.counter == 1) {
        // Get list of tables
        const res: [{ table_name: string }] = await global.prisma
          .$queryRaw`SELECT table_name from information_schema.tables WHERE table_catalog = ${
          global.testDb
        } AND table_schema = ${'public'}`;

        // Drop the tables after the tests have completed
        for (let r of res) {
          const query = `DROP TABLE ${r.table_name} CASCADE`;
          await global.prisma.$executeRawUnsafe(query);
        }
        // Release the Prisma Client connection
        await global.prisma.$disconnect();
      }

      // Decrease counter to mark the test file has already finished
      global.counter -= 1;
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
    after() {
      if (client) client.close();
      server.tryShutdown(() => {});
    },
  };
}
