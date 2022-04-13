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

  let prismaClient: null | PrismaClient = null;
  let dbName;
  return {
    async before() {
      await prismaClient?.$disconnect();

      const splitDatabase = dbUrl.split('/');
      const withoutDatabase = splitDatabase.splice(0, splitDatabase.length - 1);
      const withDatabase = withoutDatabase;

      // Generate a unique database for this test context
      dbName = `test-${uuidv4()}`;
      withDatabase.push(dbName);

      const databaseUrl = withDatabase.join('/');
      global.process.env.DATABASE_URL = `${databaseUrl}?schema=public`;

      // Run the migrations to ensure our schema has the required structure
      execSync(`${PATH} ${prismaBinary} db push --schema=${schemaFilePath}`, {
        env: { DATABASE_URL: global.process.env.DATABASE_URL },
      });

      // Construct a new Prisma Client connected to the generated database
      prismaClient = new PrismaClient();
      await prismaClient.$connect();
      return prismaClient;
    },
    async after() {
      // Get list of tables
      const res: [{ table_name: string }] =
        await prismaClient.$queryRaw`SELECT table_name from information_schema.tables WHERE table_catalog = ${dbName} AND table_schema = ${'public'}`;

      // Drop the tables after the tests have completed
      for (let r of res) {
        const query = `DROP TABLE ${r.table_name} CASCADE`;
        await prismaClient.$executeRawUnsafe(query);
      }
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
    after() {
      if (client) client.close();
      server.tryShutdown(() => {});
    },
  };
}
