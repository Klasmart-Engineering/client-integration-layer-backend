import { expect } from 'chai';
import {
  addClassesToSchoolReq,
  classReq,
  createInvalidRequestNoLink,
  createInvalidRequestNotStated,
  createOrg,
  onboard,
  persistPrograms,
  schoolReq,
  setUpClass,
  setUpSchool,
} from './util';

import {
  AddClassesToSchool,
  BatchOnboarding,
  Class,
  Responses,
  School,
} from '../../src/lib/protos';
import { ExternalUuid, proto } from '../../src';

export type AddClassesToSchoolTestCase = {
  scenario: string;
  addProgramsToSchool: AddClassesToSchool;
};

function setUpAddClassesToSchool(
  schoolId: ExternalUuid,
  classIds: Array<ExternalUuid>
): AddClassesToSchool {
  return new AddClassesToSchool()
    .setExternalClassUuidsList(classIds)
    .setExternalSchoolUuid(schoolId);
}

describe('Adding classes to school', () => {
  let orgId: ExternalUuid;
  let school: School;
  let clazz: Class;

  before(async () => {
    orgId = await createOrg();
    // Add programs from admin service to generic backend db
    await persistPrograms(orgId);
    school = setUpSchool(orgId);
    clazz = setUpClass(orgId, school.getExternalUuid());

    const setUpResponse = await onboard(
      new BatchOnboarding().setRequestsList([
        schoolReq(school),
        classReq(clazz),
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
  });

  it('should pass when adding programs to school with dupes', async () => {
    const school1 = setUpSchool(orgId);
    const school2 = setUpSchool(orgId);
    const class1 = setUpClass(orgId, school1.getExternalUuid());
    const class2 = setUpClass(orgId, school1.getExternalUuid());
    const class3 = setUpClass(orgId, school2.getExternalUuid());

    const setUp = await onboard(
      new BatchOnboarding().setRequestsList([
        schoolReq(school1),
        schoolReq(school2),
        classReq(class1),
        classReq(class2),
        classReq(class3),
      ])
    );

    expect(setUp.getResponsesList()).to.be.length(5);
    expect(
      setUp.getResponsesList().filter((response) => !response.getSuccess())
    ).to.be.length(0);
    expect(
      setUp.getResponsesList().filter((response) => response.hasErrors())
    ).to.be.length(0);

    const response = await onboard(
      new BatchOnboarding().setRequestsList([
        addClassesToSchoolReq(
          setUpAddClassesToSchool(school1.getExternalUuid(), [
            class1.getExternalUuid(),
          ])
        ),
        addClassesToSchoolReq(
          setUpAddClassesToSchool(school2.getExternalUuid(), [
            class2.getExternalUuid(),
            class3.getExternalUuid(),
          ])
        ),
      ])
    );

    expect(response.getResponsesList()).to.be.length(3);
    expect(
      response.getResponsesList().filter((response) => !response.getSuccess())
    ).to.be.length(0);
    expect(
      response.getResponsesList().filter((response) => response.hasErrors())
    ).to.be.length(0);
    expect(
      response.getResponsesList().map((response) => response.getEntityId())
    ).to.includes.members([
      class1.getExternalUuid(),
      class2.getExternalUuid(),
      class3.getExternalUuid(),
    ]);

    const dupeResponse = await onboard(
      new BatchOnboarding().setRequestsList([
        addClassesToSchoolReq(
          setUpAddClassesToSchool(school1.getExternalUuid(), [
            class1.getExternalUuid(),
          ])
        ),
        addClassesToSchoolReq(
          setUpAddClassesToSchool(school2.getExternalUuid(), [
            class2.getExternalUuid(),
            class3.getExternalUuid(),
          ])
        ),
      ])
    );

    expect(dupeResponse.getResponsesList()).to.be.length(3);
    expect(
      dupeResponse.getResponsesList().filter((response) => response.hasErrors())
    ).to.be.length(3);
    expect(
      dupeResponse
        .getResponsesList()
        .map((error) => error.getErrors())
        .filter((error) => error!.getEntityAlreadyExists())
    ).to.be.length(3);
    expect(
      response.getResponsesList().map((response) => response.getEntityId())
    ).to.includes.members([
      class1.getExternalUuid(),
      class2.getExternalUuid(),
      class3.getExternalUuid(),
    ]);

    const class4 = setUpClass(orgId, school1.getExternalUuid());
    const class5 = setUpClass(orgId, school2.getExternalUuid());
    const setUpMix = await onboard(
      new BatchOnboarding().setRequestsList([
        classReq(class4),
        classReq(class5),
      ])
    );
    expect(setUpMix.getResponsesList()).to.be.length(2);
    expect(
      setUpMix.getResponsesList().filter((response) => !response.getSuccess())
    ).to.be.length(0);
    expect(
      setUpMix.getResponsesList().filter((response) => response.hasErrors())
    ).to.be.length(0);

    const mixResponse = await onboard(
      new BatchOnboarding().setRequestsList([
        addClassesToSchoolReq(
          setUpAddClassesToSchool(school1.getExternalUuid(), [
            class1.getExternalUuid(),
            class4.getExternalUuid(),
          ])
        ),
        addClassesToSchoolReq(
          setUpAddClassesToSchool(school2.getExternalUuid(), [
            class2.getExternalUuid(),
            class3.getExternalUuid(),
            class5.getExternalUuid(),
          ])
        ),
      ])
    );

    expect(mixResponse.getResponsesList()).to.be.length(5);
    expect(
      mixResponse
        .getResponsesList()
        .filter((response) => !response.getSuccess())
    ).to.be.length(3);
    expect(
      mixResponse.getResponsesList().filter((response) => response.hasErrors())
    ).to.be.length(3);
    expect(
      mixResponse
        .getResponsesList()
        .filter((error) => error.hasErrors())
        .map((error) => error.getErrors()!)
        .filter((error) => error.getEntityAlreadyExists())
    ).to.be.length(3);
    expect(
      mixResponse.getResponsesList().filter((response) => response.getSuccess())
    ).to.be.length(2);
    expect(
      mixResponse
        .getResponsesList()
        .filter((response) => response.getSuccess())
        .map((response) => response.getEntityId())
    ).to.be.includes.members([
      class4.getExternalUuid(),
      class5.getExternalUuid(),
    ]);
  });

  it(`should fail when adding classes to school there is no link payload`, async () => {
    const response = await onboard(
      new BatchOnboarding().setRequestsList([createInvalidRequestNoLink()])
    );

    if (response instanceof Responses || proto.Responses) {
      expect(response.getResponsesList()).to.be.length(1);
      expect(response.getResponsesList()[0].getSuccess()).to.be.false;
      expect(response.getResponsesList()[0].getEntityId()).to.equal(
        'NOT PROVIDED'
      );
      expect(response.getResponsesList()[0].getErrors()?.hasInvalidRequest()).to
        .be.true;
    }
  });

  it(`should fail when adding classes to school there is link payload but no
              statement with Link Entities`, async () => {
    const response = await onboard(
      new BatchOnboarding().setRequestsList([createInvalidRequestNotStated()])
    );

    if (response instanceof Responses || proto.Responses) {
      expect(response.getResponsesList()).to.be.length(1);
      expect(response.getResponsesList()[0].getSuccess()).to.be.false;
      expect(response.getResponsesList()[0].getEntityId()).to.equal(
        'NOT PROVIDED'
      );
      expect(response.getResponsesList()[0].getErrors()?.hasInvalidRequest()).to
        .be.true;
    }
  });

  it(`should get one valid response and 3 invalid responses(1 validation + 2 requests failures) 
      when I pass a valid LinkClassesToSchool, an invalid schema for schoolId and 2 requests with no payload`, async () => {
    const response = await onboard(
      new BatchOnboarding().setRequestsList([
        createInvalidRequestNoLink(),
        createInvalidRequestNotStated(),
        addClassesToSchoolReq(
          setUpAddClassesToSchool('fd97346a-d3f8-4951-bf6e-a0ba5c6d', [
            clazz.getExternalUuid(),
          ])
        ), // invalid external Uuid for school
        addClassesToSchoolReq(
          setUpAddClassesToSchool(school.getExternalUuid(), [
            clazz.getExternalUuid(),
          ])
        ),
      ])
    );

    if (response instanceof Responses || proto.Responses) {
      expect(response.getResponsesList()).to.be.length(4);

      expect(response.getResponsesList()[0].getSuccess()).to.be.false;
      expect(response.getResponsesList()[0].getErrors()?.hasValidation()).to.be
        .true;

      expect(response.getResponsesList()[1].getSuccess()).to.be.true;
      expect(response.getResponsesList()[1].hasErrors()).to.be.false;

      expect(response.getResponsesList()[2].getSuccess()).to.be.false;
      expect(response.getResponsesList()[2].getEntityId()).to.equal(
        'NOT PROVIDED'
      );
      expect(response.getResponsesList()[2].getErrors()?.hasInvalidRequest()).to
        .be.true;

      expect(response.getResponsesList()[3].getSuccess()).to.be.false;
      expect(response.getResponsesList()[3].getEntityId()).to.equal(
        'NOT PROVIDED'
      );
      expect(response.getResponsesList()[3].getErrors()?.hasInvalidRequest()).to
        .be.true;
    }
  });
});
