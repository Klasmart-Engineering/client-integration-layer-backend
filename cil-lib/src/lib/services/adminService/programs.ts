import { gql } from '@apollo/client/core';

export const GET_SYSTEM_PROGRAMS = gql`
  query getSystemPrograms($count: PageSize, $cursor: String) {
    programsConnection(
      direction: FORWARD
      directionArgs: { count: $count, cursor: $cursor }
      filter: {
        AND: [
          { status: { operator: eq, value: "active" } }
          { system: { operator: eq, value: true } }
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

export const GET_PROGRAMS_BY_ORGANIZATION = gql`
  query getProgramsByOrganization(
    $count: PageSize
    $cursor: String
    $orgId: UUID!
  ) {
    programsConnection(
      direction: FORWARD
      directionArgs: { count: $count, cursor: $cursor }
      filter: {
        AND: [
          { status: { operator: eq, value: "active" } }
          { organizationId: { operator: eq, value: $orgId } }
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
