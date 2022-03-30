import { gql } from '@apollo/client/core';
import { AdminService, ExternalUuid, PrismaClient, Uuid } from 'cil-lib';
import { log, LOG_STUB } from '.';

const prisma = new PrismaClient();

const GET_CLASS = gql`
  query class($classId: ID!) {
    classNode(id: $classId) {
      id
      name
    }
  }
`;

const GET_CLASS_TEACHERS_STUDENTS = gql`
  query classConnection($classConnectionId: ID!) {
    classNode(id: $classConnectionId) {
      id
      name
      teachersConnection {
        edges {
          node {
            id
          }
        }
      }
      studentsConnection {
        edges {
          node {
            id
          }
        }
      }
    }
  }
`;

const GET_CLASS_PROGRAMS = gql`
  query classProgramConnection($classConnectionId: ID!) {
    classNode(id: $classConnectionId) {
      id
      name
      programsConnection {
        edges {
          node {
            id
            name
          }
        }
      }
    }
  }
`;

export async function getClassConnections(externalUuid: ExternalUuid): Promise<
  | {
      externalUuid: ExternalUuid;
      id: Uuid;
      name: string;
      teachers: Array<{ klUuid: Uuid; externalUuid: ExternalUuid }>;
      students: Array<{ klUuid: Uuid; externalUuid: ExternalUuid }>;
    }
  | undefined
> {
  const clazz = await prisma.class.findFirst({
    where: { externalUuid: externalUuid },
  });

  if (!clazz) {
    return undefined;
  }
  const admin = await AdminService.getInstance();
  const { data } = await admin.client.query({
    query: GET_CLASS_TEACHERS_STUDENTS,
    variables: {
      classConnectionId: clazz.klUuid,
    },
    context: admin.context,
  });

  const id = data['classNode']['id'];
  const name = data['classNode']['name'];
  const teacherIds = data['classNode']['teachersConnection']['edges'] as Array<{
    node: {
      id: Uuid;
    };
  }>;

  const studentIds = data['classNode']['studentsConnection']['edges'] as Array<{
    node: {
      id: Uuid;
    };
  }>;

  const teachers = await prisma.user.findMany({
    where: {
      klUuid: {
        in: teacherIds.map((teacher) => teacher.node.id),
      },
    },
    select: {
      klUuid: true,
      externalUuid: true,
    },
  });

  const students = await prisma.user.findMany({
    where: {
      klUuid: {
        in: studentIds.map((student) => student.node.id),
      },
    },
    select: {
      klUuid: true,
      externalUuid: true,
    },
  });

  return {
    externalUuid: externalUuid,
    id,
    name,
    teachers: teachers,
    students: students,
  };
}

export async function getClass(
  externalUuid: ExternalUuid,
  externalSchoolUuid: ExternalUuid
): Promise<
  | {
      externalUuid: ExternalUuid;
      id: Uuid;
      name: string;
      externalOrgUuid: ExternalUuid;
      externalSchoolUuid: ExternalUuid;
    }
  | undefined
> {
  const classFound = await prisma.class.findUnique({
    where: { externalUuid: externalUuid },
    select: { klUuid: true, externalOrgUuid: true },
  });

  if (!classFound) {
    log(`Class not found in database. Class externalUuid: "${externalUuid}"`);
    return undefined;
  }

  const dbOrg = await prisma.organization.findUnique({
    where: { externalUuid: classFound.externalOrgUuid },
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
    query: GET_CLASS,
    variables: {
      classId: classFound.klUuid,
    },
    context: admin.context,
  });

  const classNode = data['classNode'] as {
    id: Uuid;
    name: string;
  };

  if (!classNode) {
    log(
      `GraphQL query failed (classNode is undefined). Class id: ${classFound.klUuid}`
    );
    return undefined;
  }

  return {
    id: classNode.id,
    name: classNode.name,
    externalUuid: externalUuid,
    externalOrgUuid: classFound.externalOrgUuid,
    externalSchoolUuid: externalSchoolUuid,
  };
}

export async function getClassProgramsConnections(
  externalUuid: ExternalUuid
): Promise<
  | {
      externalUuid: ExternalUuid;
      id: Uuid;
      name: string;
      programs: Array<{ klUuid: Uuid; name: string }>;
    }
  | undefined
> {
  const clazz = await prisma.class.findFirst({
    where: { externalUuid: externalUuid },
  });

  if (!clazz) {
    return undefined;
  }
  const admin = await AdminService.getInstance();
  const { data } = await admin.client.query({
    query: GET_CLASS_PROGRAMS,
    variables: {
      classConnectionId: clazz.klUuid,
    },
    context: admin.context,
  });

  const id = data['classNode']['id'];
  const name = data['classNode']['name'];
  const programIds = data['classNode']['programsConnection']['edges'] as Array<{
    node: {
      id: Uuid;
      name: string;
    };
  }>;

  const programs = await prisma.program.findMany({
    where: {
      klUuid: {
        in: programIds.map((program) => program.node.id),
      },
    },
    select: {
      klUuid: true,
      name: true,
    },
  });

  return {
    externalUuid: externalUuid,
    id,
    name,
    programs: programs,
  };
}
