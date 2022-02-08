import { gql } from '@apollo/client/core';

import { Uuid } from '../../utils';

export type AddUsersToOrganizationInput = {
  organizationId: Uuid;
  organizationRoleIds: Uuid[];
  userIds: Uuid[];
};

export type CreateOrganizationInput = {
  userId: Uuid;
  organizationName: string;
};

export const CREATE_ORGANIZATIONS = gql`
  mutation createOrgs($input: [CreateOrganizationInput!]!) {
    createOrganizations(input: $input) {
      organizations {
        id
        name
      }
    }
  }
`;

export const GET_ORGANIZATION = gql`
  query getOrganization($count: PageSize, $cursor: String, $orgName: String!) {
    organizationsConnection(
      direction: FORWARD
      directionArgs: { count: $count, cursor: $cursor }
      filter: {
        AND: [
          { status: { operator: eq, value: "active" } }
          { name: { operator: eq, value: $orgName } }
        ]
      }
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
          name
        }
      }
    }
  }
`;

export const ADD_USERS_TO_ORGANIZATIONS = gql`
  mutation addUsersToOrganizations(
    $addUsersToOrganizations: [AddUsersToOrganizationInput!]!
  ) {
    addUsersToOrganizations(input: $addUsersToOrganizations) {
      organizations {
        id
        name
      }
    }
  }
`;
