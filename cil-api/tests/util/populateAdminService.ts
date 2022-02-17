import { gql } from '@apollo/client/core';
import { AdminService, log as logger, Logger } from 'cil-lib';
import { v4 as uuidv4 } from 'uuid';

const ADD_ROLES = gql`
  mutation roles($input: [CreateRoleInput!]!) {
    createRoles(input: $input) {
      roles {
        id
        name
      }
    }
  }
`;

const ADD_PROGRAMS = gql`
  mutation programs($input: [CreateProgramInput!]!) {
    createPrograms(input: $input) {
      programs {
        id
        name
      }
    }
  }
`;

const GET_SYSTEM_AGE_RANGES = gql`
  query {
    ageRangesConnection(direction: FORWARD) {
      edges {
        node {
          id
          name
        }
      }
    }
  }
`;

const GET_SYSTEM_SUBJECTS = gql`
  query {
    subjectsConnection(direction: FORWARD) {
      edges {
        node {
          id
          name
        }
      }
    }
  }
`;

const GET_SYSTEM_GRADES = gql`
  query {
    gradesConnection(direction: FORWARD) {
      edges {
        node {
          id
          name
        }
      }
    }
  }
`;

async function createUsersAndOrgs(
  orgNames: string[],
  roles: string[],
  programs: string[],
  admin: AdminService,
  log: Logger
) {
  const users = [];
  const orgs = [];
  for (let i = 0; i < orgNames.length; i += 1) {
    const suffix = uuidv4().slice(0, 5);
    users.push({
      givenName: `Given${suffix}`,
      familyName: `Family${suffix}`,
      contactInfo: {
        email: `test${suffix}@test.com`,
      },
      dateOfBirth: '01-2018',
      username: `User${suffix}`,
      gender: 'Male',
    });
  }
  const usersResponse = await admin.createUsers(users, log);
  for (let i = 0; i < orgNames.length; i += 1) {
    orgs.push({
      userId: usersResponse[i].id,
      organizationName: orgNames[i],
    });
  }

  const results = new Map();
  const createOrgResult = (await admin.createOrganizations(orgs, log)).map(
    ({ id, name }) => ({ id, name })
  );
  for (const org of createOrgResult) {
    const roleIds = await addRoles(org.id, roles, admin);
    const programIds = await addPrograms(org.id, programs, admin);
    results.set(org, { roles: roleIds, programs: programIds });
  }
  return results;
}

async function addRoles(org: string, roleNames: string[], admin: AdminService) {
  const input = [];
  for (const r of roleNames) {
    input.push({
      organizationId: org,
      roleName: r,
      roleDescription: uuidv4(),
    });
  }
  const { data } = await admin.client.mutate({
    mutation: ADD_ROLES,
    variables: {
      input,
    },
    context: admin.context,
  });
  return data['createRoles']['roles'];
}

async function getProgramMetadata(
  admin: AdminService,
  connection: 'ageRangesConnection' | 'gradesConnection' | 'subjectsConnection'
) {
  let query;
  switch (connection) {
    case 'ageRangesConnection':
      query = GET_SYSTEM_AGE_RANGES;
      break;
    case 'gradesConnection':
      query = GET_SYSTEM_GRADES;
      break;
    case 'subjectsConnection':
      query = GET_SYSTEM_SUBJECTS;
      break;
    default:
      throw new Error('Failed to match on connection type');
  }
  const { data } = await admin.client.query({
    query,
    variables: {},
    context: admin.context,
  });
  const result = [];
  for (const node of data[connection]['edges']) {
    const n = node['node'];
    result.push({ id: n['id'], name: n['name'] });
  }
  return result;
}

async function addPrograms(
  org: string,
  programs: string[],
  admin: AdminService
) {
  const grades = await getProgramMetadata(admin, 'gradesConnection');
  const subjects = await getProgramMetadata(admin, 'subjectsConnection');
  const ageRanges = await getProgramMetadata(admin, 'ageRangesConnection');

  const input = [];
  for (const p of programs) {
    input.push({
      organizationId: org,
      name: p,
      ageRangeIds: ageRanges.map(({ id }) => id),
      gradeIds: grades.map(({ id }) => id),
      subjectIds: subjects.map(({ id }) => id),
    });
  }
  const { data } = await admin.client.mutate({
    mutation: ADD_PROGRAMS,
    variables: {
      input,
    },
    context: admin.context,
  });
  return data['createPrograms']['programs'];
}

export type IdName = { id: string; name: string };

export async function populateAdminService(
  orgNames: string[] = [],
  roles: string[] = ['TEST ROLE 1', 'TEST ROLE 2', 'TEST ROLE 3'],
  programs: string[] = [
    'TEST PROGRAM 1',
    'TEST PROGRAM 2',
    'TEST PROGRAM 3',
    'TEST PROGRAM 4',
  ],
  log: Logger = logger
): Promise<Map<IdName, { roles: IdName[]; programs: IdName[] }>> {
  if (orgNames.length === 0) {
    orgNames.push(`Test Org ${uuidv4().slice(0, 7)}`);
  }
  const admin = await AdminService.getInstance();
  const orgs = await createUsersAndOrgs(orgNames, roles, programs, admin, log);

  log.info(`=== Successfully completed setup ===`);
  return orgs;
}
