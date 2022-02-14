import { gql } from '@apollo/client/core';

import { Uuid } from '../../utils';

export type CreateClassInput = {
  name: string;
  organizationId: Uuid;
  shortcode?: string;
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
  mutation addProgramsToClasses(
    $addProgramsToClasses: [AddProgramsToClassInput!]!
  ) {
    addProgramsToClasses(input: $addProgramsToClasses) {
      classes {
        id
        name
      }
    }
  }
`;
