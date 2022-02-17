import {
  ApolloClient,
  DocumentNode,
  from,
  HttpLink,
  InMemoryCache,
  NormalizedCacheObject,
  TypedDocumentNode,
} from '@apollo/client/core';
import { onError } from '@apollo/client/link/error';
import { RetryLink } from '@apollo/client/link/retry';
import fetch from 'cross-fetch';
import { Logger } from 'pino';

import {
  Category,
  ENVIRONMENT_VARIABLE_ERROR,
  MachineError,
  OnboardingError,
} from '../../errors';
import { Entity } from '../../types';
import { log as baseLogger, Uuid } from '../../utils';

import {
  ADD_PROGRAMS_TO_CLASSES,
  AddProgramsToClassInput,
  CREATE_CLASSES,
  CreateClassInput,
} from './class';
import {
  ADD_USERS_TO_ORGANIZATIONS,
  AddUsersToOrganizationInput,
  CREATE_ORGANIZATIONS,
  CreateOrganizationInput,
  GET_ORGANIZATION,
} from './organization';
import { GET_PROGRAMS_BY_ORGANIZATION, GET_SYSTEM_PROGRAMS } from './programs';
import { GET_ORGANIZATION_ROLES, GET_SYSTEM_ROLES } from './roles';
import {
  ADD_CLASSES_TO_SCHOOL,
  ADD_PROGRAMS_TO_SCHOOLS,
  AddClassesToSchoolInput,
  AddProgramsToSchoolInput,
  CREATE_SCHOOLS,
  CreateSchoolInput,
} from './school';
import {
  ADD_ORGANIZATION_ROLES_TO_USER,
  ADD_STUDENTS_TO_CLASS,
  ADD_TEACHERS_TO_CLASS,
  ADD_USERS_TO_SCHOOL,
  AddOrganizationRolesToUser,
  AddStudentsToClassInput,
  AddTeachersToClassInput,
  AddUsersToSchool,
  ContactInfo,
  CREATE_USERS,
  CreateUserInput,
} from './users';

type SupportedConnections =
  | 'programsConnection'
  | 'rolesConnection'
  | 'organizationsConnection';

type MutationAccessor =
  | 'createOrganizations'
  | 'createSchools'
  | 'createClasses'
  | 'createUsers'
  | 'addStudentsToClasses'
  | 'addTeachersToClasses'
  | 'addUsersToOrganizations'
  | 'addOrganizationRolesToUsers'
  | 'addClassesToSchools'
  | 'addProgramsToClasses'
  | 'addProgramsToSchools'
  | 'addUsersToSchools';

export type IdNameMapper = {
  id: Uuid;
  name: string;
};

const idNameTransformer = ({ id, name }: IdNameMapper): IdNameMapper => ({
  id,
  name,
});

export class AdminService {
  private static _instance: AdminService;
  public readonly context: { headers: { authorization: string } };

  private constructor(
    private _client: ApolloClient<NormalizedCacheObject>,
    apiKey: string
  ) {
    this.context = { headers: { authorization: `Bearer ${apiKey}` } };
  }

  public static async getInstance() {
    if (this._instance) return this._instance;

    const apiKey = process.env.ADMIN_SERVICE_API_KEY;
    if (!apiKey || apiKey.length === 0) {
      throw ENVIRONMENT_VARIABLE_ERROR('ADMIN_SERVICE_API_KEY');
    }

    const httpLink = new HttpLink({
      uri: process.env.ADMIN_SERVICE_URL,
      fetch,
    });
    /**
     * Only retry network errors
     *
     * Reference: https://www.apollographql.com/docs/react/api/link/apollo-link-retry/
     */
    const retryLink = new RetryLink({
      delay: {
        initial: 300,
        max: Infinity,
        jitter: true,
      },
      attempts: {
        max: 5,
        retryIf: (error, _operation) => !!error,
      },
    });
    const errorLink = onError(({ graphQLErrors, networkError, response }) => {
      new OnboardingError(
        MachineError.NETWORK,
        'Recieved error when sending request to admin service',
        Category.ADMIN_SERVICE,
        baseLogger,
        [],
        {},
        [
          ...(graphQLErrors?.map((e) => e as unknown as string) || []),
          ...(response?.errors?.map((m) => m as unknown as string) || []),
          networkError?.message || '',
        ]
      );
    });

    try {
      const client = new ApolloClient({
        link: from([errorLink, retryLink, httpLink]),
        cache: new InMemoryCache(),
      });

      this._instance = new AdminService(client, apiKey);
      baseLogger.info('Connected to KidsLoop admin service');
      return this._instance;
    } catch (error) {
      baseLogger.error('❌ Failed to connect KidsLoop admin service', {
        error,
      });
      throw error;
    }
  }

  get client(): ApolloClient<NormalizedCacheObject> {
    return this._client;
  }

  public async getSystemPrograms(log: Logger): Promise<IdNameMapper[]> {
    const results = await this.traversePaginatedQuery(
      GET_SYSTEM_PROGRAMS,
      idNameTransformer,
      'programsConnection',
      log
    );
    return results;
  }

  public async getOrganizationPrograms(
    orgId: Uuid,
    log: Logger
  ): Promise<IdNameMapper[]> {
    const results = await this.traversePaginatedQuery(
      GET_PROGRAMS_BY_ORGANIZATION,
      idNameTransformer,
      'programsConnection',
      log,
      { orgId }
    );
    return results;
  }

  public async getSystemRoles(log: Logger): Promise<IdNameMapper[]> {
    const results = await this.traversePaginatedQuery(
      GET_SYSTEM_ROLES,
      idNameTransformer,
      'rolesConnection',
      log
    );
    return results;
  }

  public async getOrganizationRoles(
    orgId: Uuid,
    log: Logger
  ): Promise<IdNameMapper[]> {
    const results = await this.traversePaginatedQuery(
      GET_ORGANIZATION_ROLES,
      idNameTransformer,
      'rolesConnection',
      log,
      { orgId }
    );
    return results;
  }

  public async getOrganization(orgName: string, log: Logger): Promise<Uuid> {
    const transformer = ({ id }: { id: string }) => id;
    const org = await this.traversePaginatedQuery(
      GET_ORGANIZATION,
      transformer,
      'organizationsConnection',
      log,
      { orgName }
    );
    if (org.length > 1)
      throw new Error(
        `Unexpectedly found more than one organization with the name ${orgName}, unable to identify which one should be used`
      );
    if (org.length === 0) throw new Error(`Organization ${orgName} not found`);
    return org[0];
  }

  /**
   * For testing purposes only
   */
  public async createOrganizations(
    input: CreateOrganizationInput[],
    log: Logger
  ): Promise<IdNameMapper[]> {
    const transformer = (responses: { organizations: IdNameMapper[] }) =>
      responses.organizations;
    const org = await this.sendMutation(
      CREATE_ORGANIZATIONS,
      { input },
      transformer,
      'createOrganizations',
      log
    );
    return org;
  }

  public async createSchools(
    schools: CreateSchoolInput[],
    log: Logger
  ): Promise<IdNameMapper[]> {
    const transformer = (responses: {
      schools: { id: string; name: string }[];
    }) => responses.schools;
    const sch = await this.sendMutation(
      CREATE_SCHOOLS,
      { schools },
      transformer,
      'createSchools',
      log
    );
    return sch;
  }

  public async createClasses(
    classes: CreateClassInput[],
    log: Logger
  ): Promise<IdNameMapper[]> {
    const transformer = (responses: {
      classes: { id: string; name: string }[];
    }) => responses.classes;
    const cl = await this.sendMutation(
      CREATE_CLASSES,
      { classes },
      transformer,
      'createClasses',
      log
    );
    return cl;
  }

  public async createUsers(
    users: CreateUserInput[],
    log: Logger
  ): Promise<
    {
      id: Uuid;
      givenName: string;
      familyName: string;
      email?: string;
      phone?: string;
    }[]
  > {
    const transformer = (responses: {
      users: {
        id: string;
        givenName: string;
        familyName: string;
        contactInfo: ContactInfo;
      }[];
    }) =>
      responses.users.map(({ id, givenName, familyName, contactInfo }) => ({
        id,
        givenName,
        familyName,
        phone: contactInfo.phone,
        email: contactInfo.email,
      }));
    const u = await this.sendMutation(
      CREATE_USERS,
      { users },
      transformer,
      'createUsers',
      log
    );
    return u;
  }

  public async addOrganizationRolesToUser(
    roles: AddOrganizationRolesToUser[],
    log: Logger
  ): Promise<{ id: Uuid }[]> {
    const transformer = (responses: { users: { id: string }[] }) =>
      responses.users;
    const users = await this.sendMutation(
      ADD_ORGANIZATION_ROLES_TO_USER,
      { input: roles },
      transformer,
      'addOrganizationRolesToUsers',
      log
    );
    return users;
  }

  public async addUsersToSchools(
    input: AddUsersToSchool[],
    log: Logger
  ): Promise<{ id: Uuid }[]> {
    const transformer = (responses: { schools: { id: string }[] }) =>
      responses.schools;
    const schools = await this.sendMutation(
      ADD_USERS_TO_SCHOOL,
      { input },
      transformer,
      'addUsersToSchools',
      log
    );
    return schools;
  }

  public async addProgramsToClass(
    addProgramsToClasses: AddProgramsToClassInput[],
    log: Logger
  ): Promise<IdNameMapper[]> {
    const transformer = (responses: {
      classes: { id: string; name: string }[];
    }) => responses.classes;
    const cl = await this.sendMutation(
      ADD_PROGRAMS_TO_CLASSES,
      { addProgramsToClasses },
      transformer,
      'addProgramsToClasses',
      log
    );
    return cl;
  }

  public async addClassesToSchool(
    input: AddClassesToSchoolInput[],
    log: Logger
  ): Promise<{ id: Uuid; name: string }[]> {
    const transformer = (responses: {
      schools: { id: string; name: string }[];
    }) => responses.schools;
    const schools = await this.sendMutation(
      ADD_CLASSES_TO_SCHOOL,
      { input },
      transformer,
      'addClassesToSchools',
      log
    );
    return schools;
  }

  public async addProgramsToSchool(
    addProgramsToSchools: AddProgramsToSchoolInput[],
    log: Logger
  ): Promise<IdNameMapper[]> {
    const transformer = (responses: {
      schools: { id: string; name: string }[];
    }) => responses.schools;
    const sc = await this.sendMutation(
      ADD_PROGRAMS_TO_SCHOOLS,
      { addProgramsToSchools },
      transformer,
      'addProgramsToSchools',
      log
    );
    return sc;
  }

  public async addUsersToOrganizations(
    addUsersToOrganizations: AddUsersToOrganizationInput[],
    log: Logger
  ): Promise<IdNameMapper[]> {
    const transformer = (responses: {
      organizations: { id: string; name: string }[];
    }) => responses.organizations;
    const org = await this.sendMutation(
      ADD_USERS_TO_ORGANIZATIONS,
      { addUsersToOrganizations },
      transformer,
      'addUsersToOrganizations',
      log
    );
    return org;
  }

  public async addTeachersToClasses(
    input: AddTeachersToClassInput[],
    log: Logger
  ): Promise<IdNameMapper[]> {
    const transformer = (responses: {
      classes: { id: string; name: string }[];
    }) => responses.classes;
    const c = await this.sendMutation(
      ADD_TEACHERS_TO_CLASS,
      { input },
      transformer,
      'addTeachersToClasses',
      log
    );
    return c;
  }

  public async addStudentsToClasses(
    input: AddStudentsToClassInput[],
    log: Logger
  ): Promise<IdNameMapper[]> {
    const transformer = (responses: {
      classes: { id: string; name: string }[];
    }) => responses.classes;
    const c = await this.sendMutation(
      ADD_STUDENTS_TO_CLASS,
      { input },
      transformer,
      'addStudentsToClasses',
      log
    );
    return c;
  }

  /**
   * A helper function to send a request to a paginated API and walk the
   * full length of the cursor, collating all the responses before returning
   * an array of items
   *
   * @param {string} query - The GraphQL query to be sent
   * @param {function} transformer - A function that will be called on each
   * node within the response to convert the response data into the desired format
   * @param {object} variables - Any variables that need to be provided to the
   * GraphQL query
   * @returns {T[]} An array of the transformed type
   */
  private async traversePaginatedQuery<T, U>(
    query: DocumentNode | TypedDocumentNode,
    transformer: (responseData: U) => T,
    connectionName: SupportedConnections,
    logger: Logger,
    variables?: Record<string, unknown>
  ): Promise<T[]> {
    let hasNextPage = true;
    let cursor = '';

    const result: T[] = [];
    while (hasNextPage) {
      /**
       * Don't need to handle errors here because:
       *
       * - 4xx/5xx were handled in `errorLink` when initializing `ApolloClient`
       * - 2xx errors won't exist in this case
       */
      const response = await this.client.query({
        query,
        variables: {
          count: 50,
          cursor,
          ...variables,
        },
        context: this.context,
      });
      const data = response.data;
      if (!data)
        throw new OnboardingError(
          MachineError.NETWORK,
          'Received no data property on the response object',
          Category.ADMIN_SERVICE,
          logger
        );

      const responseData = data[connectionName];
      if (!responseData || !responseData.pageInfo) {
        let entity = Entity.UNKNOWN;
        switch (connectionName) {
          case 'organizationsConnection':
            entity = Entity.ORGANIZATION;
            break;
          case 'rolesConnection':
            entity = Entity.ROLE;
            break;
          case 'programsConnection':
            entity = Entity.PROGRAM;
            break;
          default:
            break;
        }

        throw new OnboardingError(
          MachineError.NOT_FOUND,
          'When trying to parse the paginated query, found no pages of data',
          Category.ADMIN_SERVICE,
          logger,
          [],
          { entity }
        );
      }
      hasNextPage = responseData.pageInfo.hasNextPage;
      cursor = responseData.pageInfo.endCursor;

      for (const { node } of responseData.edges) {
        result.push(transformer(node));
      }
    }
    return result;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async sendMutation<T, U, V extends Record<string, any>>(
    query: DocumentNode | TypedDocumentNode,
    variables: V,
    transformer: (responseData: U) => T[],
    mutationAccessor: MutationAccessor,
    logger: Logger
  ): Promise<T[]> {
    const response = await this.client.mutate({
      mutation: query,
      variables: {
        ...variables,
      },
      context: this.context,
    });
    const data = response.data;

    if (!data)
      throw new OnboardingError(
        MachineError.NETWORK,
        `Expected to receive data when sending a graphql mutation, however found
      nothing`,
        Category.ADMIN_SERVICE,
        logger
      );

    const responseData = data[mutationAccessor];
    if (responseData === null || responseData === undefined)
      throw new OnboardingError(
        MachineError.APP_CONFIG,
        `Failed to access data from mutation with accessor ${mutationAccessor}`,
        Category.ADMIN_SERVICE,
        logger
      );

    const result = transformer(responseData as U);
    return result;
  }
}
