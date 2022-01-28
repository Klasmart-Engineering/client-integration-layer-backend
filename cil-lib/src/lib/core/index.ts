export {
  processCreateOrganizations,
  ICreateOrganization,
} from './organization';
export { processCreateSchools, ICreateSchool } from './school';
export { processCreateClasses, ICreateClass } from './class';
export { processCreateUsers, ICreateUser } from './user';
export {
  process as processAddUsersToSchools,
  IncomingData as IAddUsersToSchools,
} from './addUsersToSchool';
export {
  process as processAddOrganizationRolesToUsers,
  IncomingData as IAddOrganizationRolesToUsers,
} from './addOrganizationRolesToUser';
export {
  process as processAddProgramsToClasses,
  IncomingData as IAddProgramsToClasses,
} from './addProgramsToClass';
export {
  process as processAddProgramsToSchools,
  IncomingData as IAddProgramsToSchools,
} from './addProgramsToSchool';
export {
  process as processAddUsersToClasses,
  IncomingData as IAddUsersToClasses,
} from './addUsersToClass';
export {
  process as processAddUsersToOrganizations,
  IncomingData as IAddUsersToOrganizations,
} from './addUsersToOrganization';
export {
  process as processAddClassesToSchools,
  IncomingData as IAddClassesToSchool,
} from './addClassesToSchool';

export { processOnboardingRequest } from './process';
