import { gql } from '@apollo/client/core';

import { Uuid } from '../../utils';

export type CreateClassInput = {
  name: string;
  organizationId: Uuid;
  shortCode?: string;
};

export type AddProgramsToClassInput = {
  classId: string;
  programIds: string[];
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

export const ADD_PROGRAMS_TO_CLASSES = gql`
  mutation addProgramsToClasses($input: [AddProgramsToClassInput!]!) {
    addProgramsToClasses(input: $input) {
      classes {
        id
        name
      }
    }
  }
`;
