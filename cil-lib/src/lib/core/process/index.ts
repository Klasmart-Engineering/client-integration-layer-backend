import { Message } from 'google-protobuf';
import newrelic from 'newrelic';
import { Logger } from 'pino';

import {
  processAddClassesToSchools,
  processAddOrganizationRolesToUsers,
  processAddProgramsToClasses,
  processAddProgramsToSchools,
  processAddUsersToClasses,
  processAddUsersToOrganizations,
  processAddUsersToSchools,
  processCreateClasses,
  processCreateOrganizations,
  processCreateSchools,
  processCreateUsers,
} from '..';
import { Category, MachineError, OnboardingError } from '../../errors';
import { Error as PbError } from '../../protos';
import {
  BatchOnboarding,
  Entity,
  InvalidRequestError,
  Response,
  Responses,
} from '../../protos/api_pb';
import { Operation } from '../../types';
import { IdTracked, RequestBatch } from '../batchRequest';

export async function processOnboardingRequest(
  o: BatchOnboarding,
  log: Logger
): Promise<Responses> {
  const reqs = RequestBatch.fromBatch(o, log);
  let currentOperation = reqs.getNextOperation();
  let responses: Response[] = [];
  while (currentOperation !== null) {
    switch (currentOperation) {
      case Operation.CREATE_ORGANIZATION: {
        const data = reqs.createOrganizations;
        const result = await processCreateOrganizations(data, log);
        responses = responses.concat(result);
        break;
      }
      case Operation.CREATE_SCHOOL: {
        const data = reqs.createSchools;
        const result = await processCreateSchools(data, log);
        responses = responses.concat(result);
        break;
      }
      case Operation.CREATE_CLASS: {
        const data = reqs.createClasses;
        const result = await processCreateClasses(data, log);
        responses = responses.concat(result);
        break;
      }
      case Operation.CREATE_USER: {
        const data = reqs.createUsers;
        const result = await processCreateUsers(data, log);
        responses = responses.concat(result);
        break;
      }
      case Operation.ADD_PROGRAMS_TO_SCHOOL: {
        const data = reqs.addProgramsToSchool;
        const result = await processAddProgramsToSchools(data, log);
        responses = responses.concat(result);
        break;
      }
      case Operation.ADD_PROGRAMS_TO_CLASS: {
        const data = reqs.addProgramsToClass;
        const result = await processAddProgramsToClasses(data, log);
        responses = responses.concat(result);
        break;
      }
      case Operation.ADD_CLASSES_TO_SCHOOL: {
        const data = reqs.addClassesToSchool;
        const result = await processAddClassesToSchools(data, log);
        responses = responses.concat(result);
        break;
      }
      case Operation.ADD_USERS_TO_ORGANIZATION: {
        const data = reqs.addUsersToOrganization;
        const result = await processAddUsersToOrganizations(data, log);
        responses = responses.concat(result);
        break;
      }
      case Operation.ADD_ORGANIZATION_ROLES_TO_USER: {
        const data = reqs.addOrganizationRolesToUser;
        const result = await processAddOrganizationRolesToUsers(data, log);
        responses = responses.concat(result);
        break;
      }
      case Operation.ADD_USERS_TO_SCHOOL: {
        const data = reqs.addUsersToSchool;
        const result = await processAddUsersToSchools(data, log);
        responses = responses.concat(result);
        break;
      }
      case Operation.ADD_USERS_TO_CLASS: {
        const data = reqs.addUsersToClass;
        const result = await processAddUsersToClasses(data, log);
        responses = responses.concat(result);
        break;
      }
      default:
        throw new OnboardingError(
          MachineError.APP_CONFIG,
          'When switching on an operation found an uncaught branch',
          Category.APP
        );
    }
    currentOperation = reqs.getNextOperation();
  }

  const invalidReqs = reqs.getInvalidReqs();
  for (const r of invalidReqs) {
    const resp = new Response()
      .setSuccess(false)
      .setEntity(Entity.UNKNOWN)
      .setEntityId('NOT PROVIDED')
      .setRequestId(r.request.getRequestId())
      .setErrors(
        new PbError().setInvalidRequest(
          new InvalidRequestError().setAdditionalDetailsList([r.errorMessage])
        )
      );
    responses = responses.concat(resp);
  }

  return new Responses().setResponsesList(responses);
}

export type Result<T> = {
  valid: T[];
  invalid: Response[];
};

// @TODO - Can we keep track of fails for a parent entity and stop
// processing children in advance?
export async function compose<T extends IdTracked<V, U>, V extends Message, U>(
  validate: (data: T[], log: Logger) => Promise<[Result<T>, Logger]>,
  prepare: (data: T[], log: Logger) => Promise<[Result<T>, Logger]>,
  sendRequest: (data: T[], log: Logger) => Promise<[Result<T>, Logger]>,
  store: (data: T[], log: Logger) => Promise<Response[]>,
  data: T[],
  op: Operation,
  log: Logger
): Promise<Response[]> {
  if (data.length === 0) return [];
  let responses: Response[] = [];
  let logger = log.child({ operation: op });
  log.debug('processing with next batch of processing');
  const opPath = op.toLowerCase();
  try {
    let result: Result<T>;

    result = await newrelic.startSegment(
      `${opPath}/validate`,
      false,
      async () => {
        logger = logger.child({ step: '1. VALIDATE' });
        logger.debug('attempting to validate operation');
        [result, logger] = await validate(data, logger);
        responses = responses.concat(result.invalid);
        return result;
      }
    );
    if (result.valid.length === 0) return responses;

    result = await newrelic.startSegment(
      `${opPath}/prepare`,
      false,
      async () => {
        logger = logger.child({ step: '2. PREPARE DATA FOR ADMIN SERVICE' });
        log.debug('attempting to prepare data for storage in database');
        [result, logger] = await prepare(result.valid, logger);
        responses = responses.concat(result.invalid);
        return result;
      }
    );
    if (result.valid.length === 0) return responses;

    // Process 50 elements per iteration
    const chunks = chunkItems(result.valid);
    for (const [i, chunk] of chunks.entries()) {
      result = await newrelic.startSegment(
        `${opPath}/admin/chunk-${i}`,
        false,
        async () => {
          logger = logger.child({ step: '3. SEND REQUEST TO ADMIN SERVICE' });
          log.debug('attempting to write operation to admin service');
          [result, logger] = await sendRequest(chunk, logger);
          responses = responses.concat(result.invalid);
          return result;
        }
      );
      if (result.valid.length === 0) return responses;

      result = await newrelic.startSegment(
        `${opPath}/database/chunk-${i}`,
        false,
        async () => {
          logger = logger.child({ step: '4. WRITE TO DATABASE' });
          log.debug('attempting to write operation to database');
          const databaseResult = await store(result.valid, logger);
          responses = responses.concat(databaseResult);
          return result;
        }
      );
    }
  } catch (error) {
    log.warn(
      {
        error: error instanceof Error ? error.message : `${error}`,
        operation: op,
      },
      'If you are seeing this message, it means that errors that should have already been caught have made their way through in to the compose function'
    );
  }
  return responses;
}

export const NOOP = async <T>(
  data: T[],
  log: Logger
): Promise<[Result<T>, Logger]> => [{ valid: data, invalid: [] }, log];

export const DUMMY_SEND_REQUEST = async <T>(
  _: T[],
  _log: Logger
): Promise<[Result<T>, Logger]> => {
  throw new Error('Send Request has not been implemented');
};

export const DUMMY_PREPARE = async <T>(
  _: T[],
  _log: Logger
): Promise<[Result<T>, Logger]> => {
  throw new Error('Prepare has not been implemented');
};

export const DUMMY_STORE = async <T>(
  _: T[],
  _log: Logger
): Promise<Response[]> => {
  throw new Error('Store has not been implemented');
};

function chunkItems<T>(items: T[], chunkSize = 50): T[][] {
  return items.reduce((chunks: T[][], item: T, index) => {
    const chunk = Math.floor(index / chunkSize);
    chunks[chunk] = ([] as T[]).concat(chunks[chunk] || [], item);
    return chunks;
  }, []);
}
