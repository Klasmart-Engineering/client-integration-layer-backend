import { gql } from '@apollo/client/core';
import { AdminService, ExternalUuid, PrismaClient, Uuid } from 'cil-lib';
import { log, LOG_STUB, traversePaginatedQuery } from '.';

const prisma = new PrismaClient();

const GET_SCHOOL = gql`
  query school($schoolId: ID!) {
    schoolNode(id: $schoolId) {
      id
      name
      organizationId
    }
  }
`;

const GET_SCHOOL_USERS = gql`
  query schoolConnection(
    $count: PageSize
    $cursor: String
    $schoolConnectionId: ID!
  ) {
    schoolNode(id: $schoolConnectionId) {
      id
      name
      schoolMembershipsConnection(
        direction: FORWARD
        filter: { AND: [{ status: { operator: eq, value: "active" } }] }
        cursor: $cursor
        count: $count
      ) {
        totalCount
        pageInfo {
          hasNextPage
          hasPreviousPage
          startCursor
          endCursor
        }
        edges {
          node {
            userId
          }
        }
      }
    }
  }
`;

const GET_SCHOOL_PROGRAMS = gql`
  query schoolConnection(
    $count: PageSize
    $cursor: String
    $schoolConnectionId: ID!
  ) {
    schoolNode(id: $schoolConnectionId) {
      id
      name
      programsConnection(
        direction: FORWARD
        filter: { AND: [{ status: { operator: eq, value: "active" } }] }
        cursor: $cursor
        count: $count
      ) {
        totalCount
        pageInfo {
          hasNextPage
          hasPreviousPage
          startCursor
          endCursor
        }
        edges {
          node {
            id
          }
        }
      }
    }
  }
`;

export async function getSchoolPrograms(
  externalUuid: ExternalUuid
): Promise<Array<{ klUuid: Uuid; name: string }> | undefined> {
  const school = await prisma.school.findFirst({
    where: { externalUuid: externalUuid },
  });
  if (!school) {
    log(`School not found in database. School externalUuid: "${externalUuid}"`);
    return undefined;
  }

  const transformer = (node: { id: string }) => node.id;
  const admin = await AdminService.getInstance();
  const programIds = await traversePaginatedQuery(
    admin,
    GET_SCHOOL_PROGRAMS,
    transformer,
    (data) => data['schoolNode']['programsConnection'],
    {
      schoolConnectionId: school.klUuid,
    }
  );

  if (!programIds) {
    log(
      `Programs not found in admin service. School externalUuid: "${externalUuid}"`
    );
    return undefined;
  }

  const programs = await prisma.program.findMany({
    where: {
      klUuid: {
        in: programIds,
      },
    },
    select: {
      klUuid: true,
      name: true,
    },
  });

  return programs;
}

export async function getSchoolUsers(
  externalUuid: ExternalUuid
): Promise<Array<{ klUuid: Uuid; externalUuid: ExternalUuid }> | undefined> {
  const school = await prisma.school.findFirst({
    where: { externalUuid: externalUuid },
  });
  if (!school) {
    log(`School not found in database. School externalUuid: "${externalUuid}"`);
    return undefined;
  }

  const transformer = (node: { userId: string }) => node.userId;
  const admin = await AdminService.getInstance();
  const userIds = await traversePaginatedQuery(
    admin,
    GET_SCHOOL_USERS,
    transformer,
    (data) => data['schoolNode']['schoolMembershipsConnection'],
    {
      schoolConnectionId: school.klUuid,
    }
  );

  const users = await prisma.user.findMany({
    where: {
      klUuid: {
        in: userIds,
      },
    },
    select: {
      klUuid: true,
      externalUuid: true,
    },
  });

  return users;
}

export async function getSchool(externalUuid: ExternalUuid): Promise<
  | {
      externalUuid: ExternalUuid;
      id: Uuid;
      name: string;
      externalOrgUuid: ExternalUuid;
    }
  | undefined
> {
  const school = await prisma.school.findUnique({
    where: { externalUuid: externalUuid },
    select: { klUuid: true, externalOrgUuid: true },
  });

  if (!school) {
    log(`School not found in database. School externalUuid: "${externalUuid}"`);
    return undefined;
  }

  const dbOrg = await prisma.organization.findUnique({
    where: { externalUuid: school.externalOrgUuid },
    select: { name: true },
  });

  const admin = await AdminService.getInstance();
  const adminOrg = await admin.getOrganization(dbOrg.name, LOG_STUB);

  if (!adminOrg) {
    log(
      `Organization not found in AdminService. Organization name: ${dbOrg.name}`
    );
    return undefined;
  }

  const { data } = await admin.client.query({
    query: GET_SCHOOL,
    variables: {
      schoolId: school.klUuid,
    },
    context: admin.context,
  });

  const schoolNode = data['schoolNode'] as {
    id: Uuid;
    name: string;
    organizationId: Uuid;
  };

  if (!schoolNode) {
    log(
      `GraphQL query failed (schoolNode is undefined). School id: ${school.klUuid}`
    );
    return undefined;
  }

  return {
    id: schoolNode.id,
    name: schoolNode.name,
    externalUuid: externalUuid,
    externalOrgUuid: school.externalOrgUuid,
  };
}
