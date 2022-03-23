import { gql } from '@apollo/client/core';
import { AdminService, ExternalUuid, PrismaClient, Uuid } from 'cil-lib';
import { log, LOG_STUB } from '.';

const GET_SCHOOL = gql`
  query school($schoolId: ID!) {
    schoolNode(id: $schoolId) {
      id
      name
      organizationId
    }
  }
`;

const prisma = new PrismaClient();

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
  const adminOrg = await admin.getOrganization(dbOrg.name, LOG_STUB)

  if (!adminOrg) {
    log(`Organization not found in AdminService. Organization name: ${dbOrg.name}`);
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
    log(`GraphQL query failed (schoolNode is undefined). School id: ${school.klUuid}`);
    return undefined;
  }

  return {
    id: schoolNode.id,
    name: schoolNode.name,
    externalUuid: externalUuid,
    externalOrgUuid: school.externalOrgUuid,
  };
}
