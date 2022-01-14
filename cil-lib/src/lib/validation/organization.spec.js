import test from 'ava';
import { v4 as uuidv4 } from 'uuid';

import { Organization } from '../protos/api_pb';

import { organizationSchema } from './organization';

// test('An organization should pass when the organization is valid', (t) => {
//   const org = new Organization();
//   org.setName('Test Organization');
//   org.setClientUuid('6aec2c48-aa45-464c-b3ee-59cdb9511ec1');
//   const { error } = organizationSchema.validate(org.toObject());
//   console.log(error);
//   t.falsy(error);
// });

test('test demo', (t) => {
  t.pass();
});

test.only('An organization should fail when the client uuid is invalid', (t) => {
  t.pass();
  const org = new Organization();
  org.setName('Test Organization');
  org.setClientUuid('6aec2c48-aa45-464c-b3ee-59cdb');
  t.plan(1);
  try {
    const { error } = organizationSchema.validate(org.toObject());
    console.log(error);
    t.falsy(error);
  } catch (error) {
    console.log('ERROR', error);
    t.falsy(error);
  }
});

/*
test('An organization should fail when the name is less than the minimum character limit', (t) => {
  const org = new Organization();
  org.setName('1');
  org.setClientUuid(uuidv4());
  const { error } = organizationSchema.validate(org.toObject());
  console.log(error);
  t.falsy(error);
});

test('An organization should fail when the name is more than the maximum character limit', (t) => {
  const org = new Organization();
  let orgName = 'abcdefghijklmnopqrstuvwxyz1234567890';
  for (let i = 0; i < 3; i++) orgName += orgName;
  org.setName(orgName);
  org.setClientUuid(uuidv4());
  const { error } = organizationSchema.validate(org.toObject());
  console.log(error);
  t.falsy(error);
});

test('An organization should fail when the name is missing', (t) => {
  const org = new Organization();
  org.setClientUuid(uuidv4());
  const { error } = organizationSchema.validate(org.toObject());
  console.log(error);
  t.falsy(error);
});

test('An organization should fail when the clientUuid is missing', (t) => {
  const org = new Organization();
  org.setClientUuid(uuidv4());
  const { error } = organizationSchema.validate(org.toObject());
  console.log(error);
  t.falsy(error);
});
*/
