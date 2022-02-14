import Joi from 'joi';
import { Logger } from 'pino';

import { Class, School } from '../../..';
import {
  BASE_PATH,
  Category,
  convertErrorToProtobuf,
  Errors,
  MachineError,
  OnboardingError,
} from '../../errors';
import { AddProgramsToClass, Entity as PbEntity, Response } from '../../protos';
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
        .setEntity(PbEntity.CLASS)
        .setEntityId(d.protobuf.getExternalClassUuid())
        .setErrors(e);
      invalid.push(resp);
    }
  }
  return [{ valid, invalid }, log];
}

async function validate(r: IncomingData, log: Logger): Promise<IncomingData> {
  const { protobuf } = r;

  schemaValidation(protobuf.toObject(), log);
  const classId = protobuf.getExternalClassUuid();
  const programs = protobuf.getProgramNamesList();
  const schoolId = (await Class.findOne(classId, log)).externalSchoolUuid;

  if (!schoolId) {
    throw new OnboardingError(
      MachineError.ENTITY_DOES_NOT_EXIST,
      `School Id is empty`,
      Category.REQUEST,
      log
    );
  }

  const schoolPrograms = await School.getProgramsForSchool(schoolId, log);
  const validPrograms = new Set(schoolPrograms.map((p) => p.name));
  const invalidPrograms = [];
  for (const program of programs) {
    if (validPrograms.has(program)) continue;
    invalidPrograms.push(program);
  }
  if (invalidPrograms.length > 0)
    throw new OnboardingError(
      MachineError.VALIDATION,
      `Programs: ${invalidPrograms.join(
        ', '
      )} do not belong to the parent school ${schoolId}. Any programs associated with a class must be present in their parent school`,
      Category.REQUEST,
      log
    );
  return r;
}

function schemaValidation(
  entity: AddProgramsToClass.AsObject,
  log: Logger
): void {
  const errors = new Map();
  const { error } = addProgramsToClassSchema.validate(
    entity,
    JOI_VALIDATION_SETTINGS
  );
  if (error) {
    for (const { path: p, message } of error.details) {
      const e =
        errors.get(p) ||
        new OnboardingError(
          MachineError.VALIDATION,
          `${Entity.CLASS} failed validation`,
          Category.REQUEST,
          log,
          [...BASE_PATH, 'addProgramsToClass', ...p.map((s) => `${s}`)]
        );
      e.details.push(message);
      errors.set(p, e);
    }
  }
  if (errors.size > 0) throw new Errors(Array.from(errors.values()));
}

export const addProgramsToClassSchema = Joi.object({
  externalClassUuid: Joi.string().required(),

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
