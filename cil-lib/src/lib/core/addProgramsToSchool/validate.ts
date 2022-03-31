import Joi from 'joi';
import { Logger } from 'pino';

import { Context } from '../../..';
import { School } from '../../database';
import {
  BASE_PATH,
  Category,
  convertErrorToProtobuf,
  Errors,
  MachineError,
  OnboardingError,
} from '../../errors';
import {
  AddProgramsToSchool,
  EntityDoesNotExistError,
  Entity as PbEntity,
  Error as PbError,
  Response,
} from '../../protos';
import { Entity } from '../../types';
import {
  JOI_VALIDATION_SETTINGS,
  VALIDATION_RULES,
} from '../../utils/validationRules';
import { requestIdToProtobuf } from '../batchRequest';
import { Result } from '../process';

import { IncomingData } from '.';

export async function validateMany(
  data: IncomingData[],
  log: Logger
): Promise<[Result<IncomingData>, Logger]> {
  const validRequests = [];
  let invalidRequests: Response[] = [];
  for (const d of data) {
    try {
      const { valid, invalid } = await validate(d, log);
      if (valid !== null) validRequests.push(valid);
      invalidRequests = invalidRequests.concat(invalid);
    } catch (error) {
      const e = convertErrorToProtobuf(error, log);
      const resp = new Response()
        .setSuccess(false)
        .setRequestId(requestIdToProtobuf(d.requestId))
        .setEntity(PbEntity.SCHOOL)
        .setEntityId(d.protobuf.getExternalSchoolUuid())
        .setErrors(e);
      invalidRequests.push(resp);
    }
  }
  return [{ valid: validRequests, invalid: invalidRequests }, log];
}

async function validate(
  r: IncomingData,
  log: Logger
): Promise<{ valid: IncomingData | null; invalid: Response[] }> {
  const { protobuf } = r;

  schemaValidation(protobuf.toObject(), log);
  const ctx = await Context.getInstance();

  // check that the school is valid
  const schoolId = protobuf.getExternalSchoolUuid();
  await ctx.getSchoolId(schoolId, log);

  const externalOrgId = await School.getExternalOrgId(schoolId, log);
  r.data.externalOrganizationUuid = externalOrgId;

  const invalidResponses = [];

  // check that the target programs are valid on Org
  {
    const { valid, invalid } = await ctx.getProgramNames(
      protobuf.getProgramNamesList(),
      log,
      externalOrgId
    );
    for (const name of invalid) {
      const resp = new Response()
        .setSuccess(false)
        .setRequestId(requestIdToProtobuf(r.requestId))
        .setEntity(PbEntity.SCHOOL)
        .setEntityId(schoolId)
        .setErrors(
          new PbError().setEntityDoesNotExist(
            new EntityDoesNotExistError().setDetailsList([
              `Unable to find program with name ${name} on Org ${externalOrgId}`,
            ])
          )
        );
      invalidResponses.push(resp);
    }
    const validNames = valid.map((name) => name.name);
    protobuf.setProgramNamesList(Array.from(validNames));
    r.data.programNamesList = Array.from(validNames);
  }

  // check that programs don't already belong to school
  {
    const { valid: invalid, invalid: valid } = await ctx.getProgramNames(
      protobuf.getProgramNamesList(),
      log,
      undefined,
      schoolId
    );

    for (const name of invalid) {
      const resp = new Response()
        .setSuccess(false)
        .setRequestId(requestIdToProtobuf(r.requestId))
        .setEntity(PbEntity.SCHOOL)
        .setEntityId(schoolId)
        .setErrors(
          new OnboardingError(
            MachineError.ENTITY_ALREADY_EXISTS,
            `Program: ${name.name} already belongs to School: ${schoolId}`,
            Category.REQUEST,
            log
          ).toProtobufError()
        );
      invalidResponses.push(resp);
    }

    // Re-make the initial request with only the valid users
    protobuf.setProgramNamesList(Array.from(valid));
    r.data.programNamesList = Array.from(valid);
  }

  const valid = r.data.programNamesList.length === 0 ? null : r;
  return { valid, invalid: invalidResponses };
}

function schemaValidation(
  entity: AddProgramsToSchool.AsObject,
  log: Logger
): void {
  const errors = new Map();
  const { error } = addProgramsToSchoolSchema.validate(
    entity,
    JOI_VALIDATION_SETTINGS
  );
  if (error) {
    for (const { path: p, message } of error.details) {
      const e =
        errors.get(p) ||
        new OnboardingError(
          MachineError.VALIDATION,
          `${Entity.SCHOOL} failed validation`,
          Category.REQUEST,
          log,
          [...BASE_PATH, 'addProgramsToSchool', ...p.map((s) => `${s}`)]
        );
      e.details.push(message);
      errors.set(p, e);
    }
  }
  if (errors.size > 0) throw new Errors(Array.from(errors.values()));
}

export const addProgramsToSchoolSchema = Joi.object({
  externalSchoolUuid: Joi.string().required(),

  programNamesList: Joi.array()
    .min(1)
    .items(
      Joi.string()
        .min(VALIDATION_RULES.PROGRAM_NAME_MIN_LENGTH)
        .max(VALIDATION_RULES.PROGRAM_NAME_MAX_LENGTH)
    )
    .required(),
});
