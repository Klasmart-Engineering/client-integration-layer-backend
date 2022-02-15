import { expect } from 'chai';
import {
  createOrg,
  deleteClasses,
  onboard,
  random,
  setUpClass,
  classReq,
  schoolReq,
  setUpSchool,
} from './util';
import { v4 as uuidv4 } from 'uuid';

import { BatchOnboarding, Class } from '../../src/lib/protos';
import { Context, ExternalUuid, Uuid } from '../../src';

export type AddClassesTestCase = {
  scenario: string;
  addClasses: Class[];
};

export const VALID_CREATE_CLASS: AddClassesTestCase[] = [
  {
    scenario: 'creating school',
    addClasses: [
      setUp(
        'Existing Class 1',
        'ceb4a169-6c6e-49ca-ab96-a58dcffc130f',
        '92c3471d-0008-4e0f-a991-cff286a8f183'
      ),
      setUp(
        'Existing Class 2',
        '0c4ce6a6-82a3-4b81-b9ed-541cf7b3a3bb',
        '71cc5c50-92c0-44e0-9d61-3dab8d92f7f3'
      ),
      setUp(random(), '53a0e5b9-e940-40b9-90c7-a217f3146dff', uuidv4()),
    ],
  },
];

function setUp(
  name: string,
  externalSchoolId: Uuid,
  classExternalUuid: Uuid
): Class {
  const clazz = new Class();
  clazz.setExternalUuid(classExternalUuid);
  // Assume that the org exists
  clazz.setExternalOrganizationUuid('fabd67e9-33d1-4908-842e-207192d06f7d');
  clazz.setName(name);
  // Assume that the school exists
  clazz.setExternalSchoolUuid(externalSchoolId);
  clazz.setExternalUuid(classExternalUuid);
  return clazz;
}

describe('creating classes', () => {
  let orgId: ExternalUuid;

  before(async () => {
    orgId = await createOrg();
  });

  it(`should pass when creating classes with dupes`, async () => {
    const school1 = setUpSchool(orgId);
    const school2 = setUpSchool(orgId);
    const class1 = setUpClass(orgId, school1.getExternalUuid());
    const class2 = setUpClass(orgId, school2.getExternalUuid());

    const setUpResponse = await onboard(
      new BatchOnboarding().setRequestsList([
        schoolReq(school1),
        schoolReq(school2),
      ])
    );

    expect(setUpResponse.getResponsesList()).to.be.length(2);
    expect(
      setUpResponse
        .getResponsesList()
        .filter((response) => !response.getSuccess())
    ).to.be.length(0);
    expect(
      setUpResponse
        .getResponsesList()
        .filter((response) => response.hasErrors())
    ).to.be.length(0);

    const response = await onboard(
      new BatchOnboarding().setRequestsList([
        classReq(class1),
        classReq(class2),
      ])
    );

    expect(response.getResponsesList()).to.be.length(2);
    expect(
      response.getResponsesList().filter((response) => !response.getSuccess())
    ).to.be.length(0);
    expect(
      response.getResponsesList().filter((response) => response.hasErrors())
    ).to.be.length(0);
    expect(
      response.getResponsesList().map((response) => response.getEntityId())
    ).to.be.have.members([class1.getExternalUuid(), class2.getExternalUuid()]);

    // Dupe
    expect(
      await clearClasses([class1.getExternalUuid(), class2.getExternalUuid()])
    ).to.be.true;

    const dupeResponse = await onboard(
      new BatchOnboarding().setRequestsList([
        classReq(class1),
        classReq(class2),
      ])
    );

    expect(dupeResponse.getResponsesList()).to.be.length(2);
    expect(
      dupeResponse
        .getResponsesList()
        .filter((response) => response.getSuccess())
    ).to.be.length(0);
    expect(
      dupeResponse.getResponsesList().filter((response) => response.hasErrors())
    ).to.be.length(2);
    expect(
      dupeResponse
        .getResponsesList()
        .map((response) => response.getErrors()!)
        .filter((error) => error.getEntityAlreadyExists())
    ).to.be.length(2);
    expect(
      dupeResponse.getResponsesList().map((response) => response.getEntityId())
    ).to.be.have.members([class1.getExternalUuid(), class2.getExternalUuid()]);

    // Dupe with new class
    await clearClasses([class1.getExternalUuid(), class2.getExternalUuid()]);

    const newClass = setUpClass(orgId, school1.getExternalUuid());

    const mixResponse = await onboard(
      new BatchOnboarding().setRequestsList([
        classReq(class1),
        classReq(class2),
        classReq(newClass),
      ])
    );

    expect(mixResponse.getResponsesList()).to.be.length(3);
    expect(
      mixResponse.getResponsesList().filter((response) => response.hasErrors())
    ).to.be.length(2);
    expect(
      mixResponse
        .getResponsesList()
        .filter((response) => response.hasErrors())
        .map((response) => response.getErrors()!)
        .filter((error) => error.getEntityAlreadyExists())
    ).to.be.length(2);
    expect(
      mixResponse.getResponsesList().filter((response) => response.getSuccess())
    ).to.be.length(1);
    expect(
      mixResponse.getResponsesList().map((response) => response.getEntityId())
    ).to.be.have.members([
      class1.getExternalUuid(),
      class2.getExternalUuid(),
      newClass.getExternalUuid(),
    ]);
  });

  async function clearClasses(classIds: ExternalUuid[]) {
    const ctx = await Context.getInstance();
    ctx.reset();
    return await deleteClasses(classIds);
  }
});
