import { Metadata } from '@grpc/grpc-js';
import * as grpc from '@grpc/grpc-js';
import {
  AddClassesToSchool,
  AddProgramsToClass,
  AddProgramsToSchool,
  AddUsersToOrganization,
  AddUsersToSchool,
  BatchOnboarding,
  Class,
  Gender,
  Link,
  OnboardingClient,
  OnboardingRequest,
  RequestMetadata,
  Responses,
  School,
  User,
} from '../../../src/lib/protos';
import {
  AdminService,
  ExternalUuid,
  log,
  PrismaClient,
  Uuid,
} from '../../../src';
import { v4 as uuidv4 } from 'uuid';
import { gql } from '@apollo/client/core';

const GET_PROGRAMS = gql`
  query programs($input: ProgramFilter) {
    programsConnection(direction: FORWARD, filter: $input) {
      edges {
        node {
          id
          name
        }
      }
    }
  }
`;

const client = new OnboardingClient(
  `${process.env.GENERIC_BACKEND_URL}`,
  grpc.ChannelCredentials.createInsecure()
);

const prisma = new PrismaClient();

export const onboard = async (req: BatchOnboarding): Promise<Responses> => {
  return new Promise((resolve, reject) => {
    const metadata = new Metadata();
    const apiKey = process.env.API_KEY;
    metadata.set('x-api-key', `${apiKey}`);

    client.onboard(req, metadata, (error, response) => {
      if (error !== null) {
        reject(error);
        return;
      }
      resolve(response);
    });
  });
};

export function random(): string {
  return (Math.random() + 1).toString(36).substring(7);
}

export function addUsersToOrgReq(
  orgId: ExternalUuid,
  users: Set<ExternalUuid>
): OnboardingRequest {
  const addUsersToOrg = new OnboardingRequest();
  addUsersToOrg.setRequestId(
    new RequestMetadata().setId(uuidv4()).setN(uuidv4())
  );
  addUsersToOrg.setLinkEntities(
    new Link().setAddUsersToOrganization(
      new AddUsersToOrganization()
        .setExternalOrganizationUuid(orgId)
        .setExternalUserUuidsList(Array.from(users))
        .setRoleIdentifiersList(['Student', 'Teacher'])
    )
  );
  return addUsersToOrg;
}

export function addUserToOrgReq(
  orgId: ExternalUuid,
  userId: ExternalUuid
): OnboardingRequest {
  const userSet = new Set<ExternalUuid>();
  userSet.add(userId);
  const req = addUsersToOrgReq(orgId, userSet);
  return req;
}

export function userReq(
  orgId: ExternalUuid,
  user: ExternalUuid
): OnboardingRequest {
  return new OnboardingRequest()
    .setRequestId(new RequestMetadata().setId(uuidv4()).setN(uuidv4()))
    .setUser(setUpUser(orgId, user));
}

export function setUpUser(orgId: ExternalUuid, userId: ExternalUuid): User {
  const user: User = new User()
    .setExternalUuid(userId)
    .setExternalOrganizationUuid(orgId)
    .setEmail(`${random()}@example.com`)
    .setPhone('+471643544')
    .setUsername(random())
    .setGivenName(random())
    .setFamilyName(random())
    .setGender(Gender.MALE)
    .setDateOfBirth('01-2017');

  user.addRoleIdentifiers('Student');

  return user;
}

export function addUsersToSchoolReq(
  addUsers: AddUsersToSchool
): OnboardingRequest {
  const req = new OnboardingRequest();
  req.setRequestId(new RequestMetadata().setId(uuidv4()).setN(uuidv4()));
  req.setLinkEntities(new Link().setAddUsersToSchool(addUsers));
  return req;
}

export function schoolReq(school: School): OnboardingRequest {
  const onBoardingRequest = new OnboardingRequest();
  onBoardingRequest.setRequestId(
    new RequestMetadata().setId(uuidv4()).setN(uuidv4())
  );
  onBoardingRequest.setSchool(school);
  return onBoardingRequest;
}

export function setUpSchool(orgId: ExternalUuid, schoolId = uuidv4()): School {
  return new School()
    .setName(uuidv4().substring(0, 10))
    .setExternalOrganizationUuid(orgId)
    .setShortCode(random())
    .setExternalUuid(schoolId);
}

export function classReq(clazz: Class): OnboardingRequest {
  const onBoardingRequest = new OnboardingRequest();
  onBoardingRequest.setRequestId(
    new RequestMetadata().setId(uuidv4()).setN(uuidv4())
  );
  onBoardingRequest.setClass(clazz);
  return onBoardingRequest;
}

export function setUpClass(
  orgId: ExternalUuid,
  schoolId: ExternalUuid,
  classId = uuidv4(),
  name?: string
): Class {
  return new Class()
    .setExternalOrganizationUuid(orgId)
    .setExternalSchoolUuid(schoolId)
    .setExternalUuid(classId)
    .setName(name ?? random());
}

export function addProgramsToSchoolReq(
  addProgramsToSchool: AddProgramsToSchool
): OnboardingRequest {
  return new OnboardingRequest()
    .setRequestId(new RequestMetadata().setId(uuidv4()).setN(uuidv4()))
    .setLinkEntities(new Link().setAddProgramsToSchool(addProgramsToSchool));
}

export function addProgramsToClassReq(
  addProgramsToClass: AddProgramsToClass
): OnboardingRequest {
  return new OnboardingRequest()
    .setRequestId(new RequestMetadata().setId(uuidv4()).setN(uuidv4()))
    .setLinkEntities(new Link().setAddProgramsToClass(addProgramsToClass));
}

export function addClassesToSchoolReq(
  addClassesToSchool: AddClassesToSchool
): OnboardingRequest {
  return new OnboardingRequest()
    .setRequestId(new RequestMetadata().setId(uuidv4()).setN(uuidv4()))
    .setLinkEntities(new Link().setAddClassesToSchool(addClassesToSchool));
}

export function createInvalidRequestNoLink(): OnboardingRequest {
  const requestMetadata = new RequestMetadata();
  requestMetadata.setId(uuidv4());
  requestMetadata.setN(uuidv4());

  return new OnboardingRequest().setRequestId(requestMetadata);
}

export function createInvalidRequestNotStated(): OnboardingRequest {
  const requestMetadata = new RequestMetadata();
  requestMetadata.setId(uuidv4());
  requestMetadata.setN(uuidv4());

  return new OnboardingRequest()
    .setRequestId(requestMetadata)
    .setLinkEntities(new Link());
}

export async function persistPrograms(orgId: string) {
  const admin = await AdminService.getInstance();
  const { data } = await admin.client.query({
    query: GET_PROGRAMS,
    variables: {
      input: {},
    },
    context: admin.context,
  });
  const programs = data['programsConnection']['edges'] as Array<{
    node: { id: string; name: string };
  }>;

  programs.forEach(async (p) => {
    await prisma.program.upsert({
      where: { klUuid: p.node.id },
      create: {
        klUuid: p.node.id,
        name: p.node.name,
        organization: {
          connect: { externalUuid: orgId },
        },
      },
      update: {},
    });
  });
}

export async function createOrg(): Promise<ExternalUuid> {
  const admin = await AdminService.getInstance();
  const users = await admin.createUsers(
    [
      {
        givenName: random(),
        familyName: random(),
        gender: 'male',
        contactInfo: {
          email: `${random()}@example.com`,
        },
      },
    ],
    log
  );
  const userId = users.find((user) => user)!.id;
  const orgName = random();
  const orgs = await admin.createOrganizations(
    [
      {
        userId: userId,
        organizationName: orgName,
      },
    ],
    log
  );
  const orgId = orgs.find((o) => o)!.id;
  const persistOrg = await prisma.organization.create({
    data: {
      externalUuid: uuidv4(),
      klUuid: orgId,
      name: orgName,
    },
  });
  return persistOrg.externalUuid;
}

export async function deleteUsersOrgLink(
  userIds: ExternalUuid[]
): Promise<boolean> {
  const deleteLinks = await prisma.userLinkOrganization.deleteMany({
    where: {
      externalUuid: { in: userIds },
    },
  });

  return deleteLinks.count === userIds.length;
}

export async function deleteClasses(
  classIds: ExternalUuid[]
): Promise<boolean> {
  const deleteClasses = await prisma.class.deleteMany({
    where: {
      externalUuid: { in: classIds },
    },
  });

  return deleteClasses.count === classIds.length;
}

export async function deleteSchools(
  schoolIds: ExternalUuid[]
): Promise<boolean> {
  const deleteClasses = await prisma.school.deleteMany({
    where: {
      externalUuid: { in: schoolIds },
    },
  });

  return deleteClasses.count === schoolIds.length;
}
