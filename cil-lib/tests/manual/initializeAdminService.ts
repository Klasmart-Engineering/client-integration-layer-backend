import { gql } from '@apollo/client/core';
import { v4 as uuidv4 } from 'uuid';

import { AdminService, log } from '../../src';

const USER_INPUTS = [
  {
    givenName: 'GivenName',
    familyName: 'FamilyName',
    contactInfo: {
      email: 'test@test.com',
    },
    dateOfBirth: '01-2018',
    username: 'TestUser1',
    gender: 'Male',
  },
  {
    givenName: 'GivenNameTwo',
    familyName: 'FamilyNameTwo',
    contactInfo: {
      email: 'test2@test.com',
    },
    dateOfBirth: '01-2018',
    username: 'TestUser2',
    gender: 'Female',
  },
  {
    givenName: 'GivenNameThree',
    familyName: 'FamilyNameThree',
    contactInfo: {
      email: 'test3@test.com',
    },
    dateOfBirth: '01-2018',
    username: 'TestUser3',
    gender: 'Male',
  },
];

function createOrgInputs(userIds: string[]) {
  const orgs = [
    {
      userId: userIds[0],
      organizationName: 'Chrysalis BLP Classic',
    },
    {
      userId: userIds[1],
      organizationName: 'Chrysalis BLP Premium',
    },
    {
      userId: userIds[2],
      organizationName: 'Chrysalis BLP Digital',
    },
  ];
  return orgs;
}

const ROLES = [
  'Chrysalis Teacher',
  'Chrysalis Student',
  'Digital Student',
  'Digital Teacher',
];

const PROGRAMS = [
  'BLP Grade 1',
  'BLP Grade 2',
  'BLP Grade 3',
  'BLP Grade 4',
  'BLP PP1',
  'BLP PP2',
];

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

async function addRoles(orgIds: string[], admin: AdminService) {
  const input = [];
  for (const org of orgIds) {
    for (const r of ROLES) {
      input.push({
        organizationId: org,
        roleName: r,
        roleDescription: uuidv4(),
      });
    }
  }
  const { data } = await admin.client.mutate({
    mutation: ADD_ROLES,
    variables: {
      input,
    },
    context: admin.context,
  });
  const roles = data['createRoles']['roles'];
  log.info(
    {
      result: roles.map(({ id, name }: { id: string; name: string }) => ({
        id,
        name,
      })),
    },
    'Successfully created roles'
  );
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

async function addPrograms(orgIds: string[], admin: AdminService) {
  const grades = await getProgramMetadata(admin, 'gradesConnection');
  const subjects = await getProgramMetadata(admin, 'subjectsConnection');
  const ageRanges = await getProgramMetadata(admin, 'ageRangesConnection');

  const input = [];
  for (const org of orgIds) {
    for (const p of PROGRAMS) {
      input.push({
        organizationId: org,
        name: p,
        ageRangeIds: ageRanges.map(({ id }) => id),
        gradeIds: grades.map(({ id }) => id),
        subjectIds: subjects.map(({ id }) => id),
      });
    }
  }
  const { data } = await admin.client.mutate({
    mutation: ADD_PROGRAMS,
    variables: {
      input,
    },
    context: admin.context,
  });
  const programs = data['createPrograms']['programs'];
  log.info(
    {
      result: programs.map(({ id, name }: { id: string; name: string }) => ({
        id,
        name,
      })),
    },
    `Successfully created programs for organizations`
  );
}

async function main() {
  const admin = await AdminService.getInstance();
  const createUserResult = await admin.createUsers(USER_INPUTS, log);
  log.info({ result: createUserResult }, 'Created users');

  const orgInputs = createOrgInputs(createUserResult.map(({ id }) => id));
  const createOrgResult = (await admin.createOrganizations(orgInputs, log)).map(
    ({ id, name }) => ({ id, name })
  );
  const orgIds = createOrgResult.map(({ id }) => id);
  log.info({ result: createOrgResult }, 'Created orgs');

  await addRoles(orgIds, admin);
  await addPrograms(orgIds, admin);

  log.info(`=== Successfully completed setup ===`);
}

main().catch((_e) => log.error(`Error when initializing admin service`));
