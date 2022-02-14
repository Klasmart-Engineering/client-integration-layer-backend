import { gql } from '@apollo/client/core';

import { Uuid } from '../../utils';

export type CreateSchoolInput = {
  name: string;
  organizationId: Uuid;
  shortCode?: string;
};

export type AddProgramsToSchoolInput = {
  schoolId: string;
  programIds: string[];
};

export type AddClassesToSchoolInput = {
  schoolId: string;
  classIds: string[];
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

export const ADD_PROGRAMS_TO_SCHOOLS = gql`
  mutation addProgramsToSchools(
    $addProgramsToSchools: [AddProgramsToSchoolInput!]!
  ) {
    addProgramsToSchools(input: $addProgramsToSchools) {
      schools {
        id
        name
      }
    }
  }
`;

export const ADD_CLASSES_TO_SCHOOL = gql`
  mutation addClassesToSchools($input: [AddClassesToSchoolInput!]!) {
    addClassesToSchools(input: $input) {
      schools {
        id
        name
      }
    }
  }
`;
