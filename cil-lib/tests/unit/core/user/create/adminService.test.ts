import { v4 as uuidv4 } from 'uuid';
import { expect } from 'chai';
import {
  adminServiceUserKey,
  userKey,
} from '../../../../../src/lib/core/user/create/adminService';
import { User } from '../../../../../src/lib/protos';
import { random } from '../../../../manual/util';

describe('user adminService', () => {
  let givenName = random();
  let familyName = random();
  let phone = '+3214324';
  let email = `${random()}@email.com`;
  let username = random();

  describe('user adminService adminServiceUserKey', () => {
    describe('should return userKey', () => {
      expect(
        adminServiceUserKey({
          id: uuidv4(),
          givenName,
          familyName,
          email,
          phone,
          username,
        })
      ).to.be.equal(`${givenName}|${familyName}|${email}|${phone}|${username}`);
    });

    describe('should return lowercase email', () => {
      const email = `ABC${random}@email.com`;
      expect(
        adminServiceUserKey({
          id: uuidv4(),
          givenName,
          familyName,
          email,
          phone,
          username,
        })
      ).to.be.equal(
        `${givenName}|${familyName}|${email.toLowerCase()}|${phone}|${username}`
      );
    });

    describe('should handle missing email', () => {
      expect(
        adminServiceUserKey({
          id: uuidv4(),
          givenName,
          familyName,
          phone,
          username,
        })
      ).to.be.equal(`${givenName}|${familyName}||${phone}|${username}`);
    });

    describe('should handle missing phone', () => {
      expect(
        adminServiceUserKey({
          id: uuidv4(),
          givenName,
          familyName,
          phone,
          username,
        })
      ).to.be.equal(`${givenName}|${familyName}||${phone}|${username}`);
    });

    describe('should handle missing phone', () => {
      expect(
        adminServiceUserKey({
          id: uuidv4(),
          givenName,
          familyName,
          email,
          username,
        })
      ).to.be.equal(`${givenName}|${familyName}|${email}||${username}`);
    });

    describe('should handle missing username', () => {
      expect(
        adminServiceUserKey({
          id: uuidv4(),
          givenName,
          familyName,
          phone,
          email,
        })
      ).to.be.equal(`${givenName}|${familyName}|${email}|${phone}|`);
    });

    describe('should handle missing username, email & phone', () => {
      expect(
        adminServiceUserKey({
          id: uuidv4(),
          givenName,
          familyName,
        })
      ).to.be.equal(`${givenName}|${familyName}|||`);
    });
  });

  describe('user adminService userKey', () => {
    describe('should return userKey', () => {
      expect(
        userKey(
          new User()
            .setGivenName(givenName)
            .setFamilyName(familyName)
            .setPhone(phone)
            .setEmail(email)
            .setUsername(username)
            .toObject()
        )
      ).to.be.equal(`${givenName}|${familyName}|${email}|${phone}|${username}`);
    });

    describe('should return userKey with lowercase email', () => {
      const email = `AbabA${random}@email.com`;
      expect(
        userKey(
          new User()
            .setGivenName(givenName)
            .setFamilyName(familyName)
            .setPhone(phone)
            .setEmail(email)
            .setUsername(username)
            .toObject()
        )
      ).to.be.equal(
        `${givenName}|${familyName}|${email.toLowerCase()}|${phone}|${username}`
      );
    });

    describe('should return userKey without email', () => {
      expect(
        userKey(
          new User()
            .setGivenName(givenName)
            .setFamilyName(familyName)
            .setPhone(phone)
            .setEmail('')
            .setUsername(username)
            .toObject()
        )
      ).to.be.equal(`${givenName}|${familyName}||${phone}|${username}`);
    });
  });
});
