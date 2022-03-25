import { v4 as uuidv4 } from 'uuid';
import { gql } from '@apollo/client/core';
import { AdminService, ExternalUuid, PrismaClient, proto, Uuid } from 'cil-lib';
import { random } from '.';

const { OnboardingRequest } = proto;

const GET_USER = gql`
  query users($userFilter: UserFilter) {
    usersConnection(direction: FORWARD, filter: $userFilter) {
      edges {
        node {
          id
          username
          dateOfBirth
          contactInfo {
            email
            phone
          }
          organizationMembershipsConnection {
            edges {
              node {
                organizationId
              }
            }
          }
        }
      }
    }
  }
`;

const prisma = new PrismaClient();

export async function getUser(externalUuid: ExternalUuid): Promise<
  | {
      externalUuid: ExternalUuid;
      id: Uuid;
      username: string;
      dateOfBirth: string;
      email: string;
      phone: string;
      externalOrgIds: ExternalUuid[];
    }
  | undefined
> {
  const user = await prisma.user.findFirst({
    where: { externalUuid: externalUuid },
  });

  if (!user) {
    return undefined;
  }
  const admin = await AdminService.getInstance();
  const { data } = await admin.client.query({
    query: GET_USER,
    variables: {
      userFilter: {
        userId: {
          operator: 'eq',
          value: user.klUuid,
        },
      },
    },
    context: admin.context,
  });
  const users = data['usersConnection']['edges'] as Array<{
    node: {
      id: string;
      username: string;
      dateOfBirth: string;
      contactInfo: { email: string; phone: string };
      organizationMembershipsConnection: {
        edges: [
          {
            node: {
              organizationId: string;
            };
          }
        ];
      };
    };
  }>;

  return users
    .map(async (user) => {
      const userOrgKlUuids =
        user.node.organizationMembershipsConnection.edges.map(
          (edge) => edge.node.organizationId
        );

      let externalOrgIds = [];
      if (userOrgKlUuids && userOrgKlUuids.length > 0) {
        externalOrgIds.concat(await getExternalOrgIds(userOrgKlUuids));
      }

      return {
        externalUuid: externalUuid,
        id: user.node.id,
        username: user.node.username,
        dateOfBirth: user.node.dateOfBirth,
        email: user.node.contactInfo.email,
        phone: user.node.contactInfo.phone,
        externalOrgIds,
      };
    })
    .find((user) => user != undefined);
}

async function getExternalOrgIds(orgIds: Uuid[]): Promise<ExternalUuid[]> {
  const orgs = await prisma.organization.findMany({
    where: { klUuid: { in: orgIds } },
    select: { externalUuid: true },
  });
  return orgs.map((org) => org.externalUuid);
}

export async function deleteUsers(userIds: ExternalUuid[]): Promise<boolean> {
  const deleteUsers = await prisma.user.deleteMany({
    where: {
      externalUuid: { in: userIds },
    },
  });

  return deleteUsers.count === userIds.length;
}

export function userReq(
  orgId: ExternalUuid,
  user: ExternalUuid
): proto.OnboardingRequest {
  return new OnboardingRequest()
    .setRequestId(new proto.RequestMetadata().setId(uuidv4()).setN(uuidv4()))
    .setUser(setUpUser(orgId, user));
}

export function setUpUser(
  orgId: ExternalUuid,
  userId: ExternalUuid
): proto.User {
  const user: proto.User = new proto.User()
    .setExternalUuid(userId)
    .setExternalOrganizationUuid(orgId)
    .setEmail(`${random()}@example.com`)
    .setPhone('+471643544')
    .setUsername(random())
    .setGivenName(random())
    .setFamilyName(random())
    .setGender(proto.Gender.MALE)
    .setDateOfBirth('01-2017');

  user.addRoleIdentifiers('Student');

  return user;
}
