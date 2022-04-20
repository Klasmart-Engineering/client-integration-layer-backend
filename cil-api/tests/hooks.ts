import { v4 as uuidv4 } from 'uuid';
import { Context, grpc, PrismaClient, proto } from 'cil-lib';
import { OnboardingClient } from 'cil-lib/dist/main/lib/protos';
import { OnboardingServer } from '../src/lib/api';

const { execSync } = require('child_process');
const path = require('path');

const testDb = `test-${uuidv4()}`;
const dbUrl = process.env.DATABASE_URL;

export const mochaHooks = (): Mocha.RootHookObject => {
  const prismaCtx = prismaTestContext();
  const grpcCtx = grpcTestContext();

  return {
    async beforeAll() {
      await grpcCtx.before().then((c) => {
        global.client = c;
      });

      // init Prisma
      await prismaCtx.before();
    },
    async afterAll() {
      await prismaCtx.after();
      grpcCtx.after();
    },
  };
};

function prismaTestContext() {
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

      const splitDatabase = dbUrl.split('/');
      const withoutDatabase = splitDatabase.splice(0, splitDatabase.length - 1);
      const withDatabase = withoutDatabase;

      withDatabase.push(testDb);

      const databaseUrl = withDatabase.join('/');
      global.process.env.DATABASE_URL = `${databaseUrl}?schema=public`;

      // Run the migrations to ensure our schema has the required structure
      execSync(`${PATH} ${prismaBinary} db push --schema=${schemaFilePath}`, {
        env: { DATABASE_URL: global.process.env.DATABASE_URL },
      });
      // Get prisma connected to the generated database
      global.prisma = new PrismaClient();
      await global.prisma.$connect();

      return global.prisma;
    },
    async after() {
      // Get list of tables
      const res: [{ table_name: string }] = await global.prisma
        .$queryRaw`SELECT table_name from information_schema.tables WHERE table_catalog = ${testDb} AND table_schema = ${'public'}`;

      // Drop the tables after the tests have completed
      for (let r of res) {
        const query = `DROP TABLE ${r.table_name} CASCADE`;
        await global.prisma.$executeRawUnsafe(query);
      }
      // Release the Prisma Client connection
      await global.prisma.$disconnect();
    },
  };
}

function grpcTestContext() {
  return {
    async before() {
      return new Promise<OnboardingClient>((resolve, reject) => {
        Context.getInstance(true);
        global.server = new grpc.Server();
        global.server.addService(
          proto.OnboardingService,
          new OnboardingServer()
        );

        global.server.bindAsync(
          'localhost:0',
          grpc.ServerCredentials.createInsecure(),

          (err, port) => {
            if (err) {
              reject(err);
            }
            global.client = new OnboardingClient(
              `localhost:${port}`,
              grpc.credentials.createInsecure()
            );
            global.server.start();
            resolve(global.client);
          }
        );
      });
    },
    after() {
      if (global.client) global.client.close();
      global.server.tryShutdown(() => {});
    },
  };
}
