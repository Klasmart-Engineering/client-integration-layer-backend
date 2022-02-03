import Joi from 'joi';
import { Logger } from 'pino';

import { Context, Link } from '../../..';
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
  Entity as PbEntity,
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
  const valid = [];
  const invalid = [];
  for (const d of data) {
    try {
      valid.push(await validate(d, log));
    } catch (error) {
      const e = convertErrorToProtobuf(error, log);
      const resp = new Response()
        .setSuccess(false)
        .setRequestId(requestIdToProtobuf(d.requestId))
        .setEntity(PbEntity.SCHOOL)
        .setEntityId(d.protobuf.getExternalSchoolUuid())
        .setErrors(e);
      invalid.push(resp);
    }
  }
  return [{ valid, invalid }, log];
}

async function validate(r: IncomingData, log: Logger): Promise<IncomingData> {
  const { protobuf } = r;

  schemaValidation(protobuf.toObject(), log);
  const schoolId = protobuf.getExternalSchoolUuid();
  const orgId = protobuf.getExternalOrganizationUuid();
  await Link.schoolBelongsToOrganization(schoolId, orgId, log);

  const ctx = Context.getInstance();
  await ctx.programsAreValid(protobuf.getProgramNamesList(), orgId, log);
  return r;
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
          [...BASE_PATH, 'addProgramsToSchool', ...p.map(toString)]
        );
      e.details.push(message);
      errors.set(p, e);
    }
  }
  if (errors.size > 0) throw new Errors(Array.from(errors.values()));
}

export const addProgramsToSchoolSchema = Joi.object({
  externalSchoolUuid: Joi.string().required(),

  externalOrganizationUuid: Joi.string()
    .guid({ version: ['uuidv4'] })
    .required(),

  programNamesList: Joi.array()
    .min(1)
    .items(
      Joi.string()
        .min(VALIDATION_RULES.PROGRAM_NAME_MIN_LENGTH)
        .max(VALIDATION_RULES.PROGRAM_NAME_MAX_LENGTH)
    )
    .required(),
});
