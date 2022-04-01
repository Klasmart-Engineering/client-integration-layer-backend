import { gql } from '@apollo/client/core';

import { Uuid } from '../../utils';

export type CreateUserInput = {
  givenName: string;
  familyName: string;
  contactInfo?: ContactInfo;
  username?: string;
  dateOfBirth?: string;
  gender: string;
  alternateEmail?: string;
  alternatePhone?: string;
};

export type ContactInfo = {
  email?: string;
  phone?: string;
};

export const CREATE_USERS = gql`
  mutation createUsers($users: [CreateUserInput!]!) {
    createUsers(input: $users) {
      users {
        id
        givenName
        familyName
        contactInfo {
          email
          phone
        }
        username
      }
    }
  }
`;

export type AddOrganizationRolesToUser = {
  userId: Uuid;
  organizationId: Uuid;
  roleIds: Uuid[];
};

export const ADD_ORGANIZATION_ROLES_TO_USER = gql`
  mutation addOrgRolesToUser($input: [AddOrganizationRolesToUserInput!]!) {
    addOrganizationRolesToUsers(input: $input) {
      users {
        id
      }
    }
  }
`;

export type AddUsersToSchool = {
  schoolId: Uuid;
  userIds: Uuid[];
  schoolRoleIds?: Uuid[];
};

export const ADD_USERS_TO_SCHOOL = gql`
  mutation addUsersToSchool($input: [AddUsersToSchoolInput!]!) {
    addUsersToSchools(input: $input) {
      schools {
        id
      }
    }
  }
`;

export type AddTeachersToClassInput = {
  classId: Uuid;
  teacherIds: Uuid[];
};

export const ADD_TEACHERS_TO_CLASS = gql`
  mutation addTeachersToClasses($input: [AddTeachersToClassInput!]!) {
    addTeachersToClasses(input: $input) {
      classes {
        id
        name
      }
    }
  }
`;

export type AddStudentsToClassInput = {
  classId: Uuid;
  studentIds: Uuid[];
};

export const ADD_STUDENTS_TO_CLASS = gql`
  mutation addStudentsToClasses($input: [AddStudentsToClassInput!]!) {
    addStudentsToClasses(input: $input) {
      classes {
        id
        name
      }
    }
  }
`;
