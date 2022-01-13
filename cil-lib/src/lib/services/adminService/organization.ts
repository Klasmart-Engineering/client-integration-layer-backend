import { gql } from '@apollo/client/core';

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
