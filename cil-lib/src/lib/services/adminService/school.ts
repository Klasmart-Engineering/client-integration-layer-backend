import { gql } from '@apollo/client/core';

import { Uuid } from '../../utils';

export type CreateSchoolInput = {
  name: string;
  organizationId: Uuid;
  shortCode?: string;
};

export const CREATE_SCHOOLS = gql`
  mutation createSchools($schools: [CreateSchoolInput!]!) {
    createSchools(input: $schools) {
      schools {
        id
        name
      }
    }
  }
`;
