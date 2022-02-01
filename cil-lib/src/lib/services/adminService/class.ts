import { gql } from '@apollo/client/core';

import { Uuid } from '../../utils';

export type CreateClassInput = {
  name: string;
  organizationId: Uuid;
  shortCode?: string;
};

export const CREATE_CLASSES = gql`
  mutation createClasses($classes: [CreateClassInput!]!) {
    createClasses(input: $classes) {
      classes {
        id
        name
      }
    }
  }
`;
