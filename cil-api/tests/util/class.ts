import { gql } from '@apollo/client/core';
import { AdminService, ExternalUuid, PrismaClient, Uuid } from 'cil-lib';

const prisma = new PrismaClient();

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
