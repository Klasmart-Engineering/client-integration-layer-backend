import { gql } from '@apollo/client/core';

export type CreateUserInput = {
  givenName: string;
  familyName: string;
  contactInfo: ContactInfo;
  username?: string;
  dateOfBirth?: string;
  gender: string;
  shortcode?: string;
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
      }
    }
  }
`;
