import Joi from 'joi';
import { Logger } from 'pino';

import { Context } from '../../..';
import { JOI_VALIDATION_SETTINGS, Link } from '../../..';
import {
  BASE_PATH,
  Category,
  convertErrorToProtobuf,
  Errors,
  MachineError,
  OnboardingError,
} from '../../errors';
import {
  AddClassesToSchool,
  EntityDoesNotExistError,
  Entity as PbEntity,
  Error as PbError,
  Response,
} from '../../protos';
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
      if (d.protobuf.getExternalClassUuidsList()?.length == 0) {
        const resp = new Response()
          .setSuccess(false)
          .setRequestId(requestIdToProtobuf(d.requestId))
          .setEntity(PbEntity.SCHOOL)
          .setEntityId(d.protobuf.getExternalSchoolUuid())
          .setErrors(e);
        invalidRequests.push(resp);
      } else {
        for (const classId of d.protobuf.getExternalClassUuidsList()) {
          const resp = new Response()
            .setSuccess(false)
            .setRequestId(requestIdToProtobuf(d.requestId))
            .setEntity(PbEntity.CLASS)
            .setEntityId(classId)
            .setErrors(e);
          invalidRequests.push(resp);
        }
      }
    }
  }

  return [{ valid: validRequests, invalid: invalidRequests }, log];
}

async function validate(
  r: IncomingData,
  log: Logger
): Promise<{
  valid: IncomingData | null;
  invalid: Response[];
}> {
  const { protobuf } = r;

  schemaValidation(protobuf.toObject(), log);
  const schoolId = protobuf.getExternalSchoolUuid();
  const invalidResponses = [];

  const ctx = await Context.getInstance();
  // Check the target classes are valid
  {
    // Use Context to get cached class ids
    const { valid, invalid } = await ctx.getClassIds(
      protobuf.getExternalClassUuidsList(),
      log
    );

    if (valid.size === 0)
      throw new OnboardingError(
        MachineError.VALIDATION,
        `None of the provided class ids were valid`,
        Category.REQUEST,
        log
      );

    for (const id of invalid) {
      const resp = new Response()
        .setSuccess(false)
        .setRequestId(requestIdToProtobuf(r.requestId))
        .setEntity(PbEntity.CLASS)
        .setEntityId(id)
        .setErrors(
          new PbError().setEntityDoesNotExist(
            new EntityDoesNotExistError().setDetailsList([
              `Unable to find class with id ${id}`,
            ])
          )
        );
      invalidResponses.push(resp);
    }
    protobuf.setExternalClassUuidsList(Array.from(valid.keys()));
    r.data.externalClassUuidsList = Array.from(valid.keys());
    // Checking that both sets of ids are valid are covered by this
    await Link.shareTheSameOrganization(
      log,
      [schoolId],
      Array.from(valid.keys())
    );
  }

  // Check if the valid classes already linked to the school
  {
    const { valid: invalid, invalid: valid } =
      await Link.classesBelongToSchools(
        protobuf.getExternalClassUuidsList(),
        log
      );

    for (const id of invalid) {
      const resp = new Response()
        .setSuccess(false)
        .setRequestId(requestIdToProtobuf(r.requestId))
        .setEntity(PbEntity.CLASS)
        .setEntityId(id)
        .setErrors(
          new OnboardingError(
            MachineError.ENTITY_ALREADY_EXISTS,
            `Class: ${id} already belongs to school`,
            Category.REQUEST,
            log
          ).toProtobufError()
        );
      invalidResponses.push(resp);
    }
    // Re-make the initial request with only the valid classes
    protobuf.setExternalClassUuidsList(valid);
    r.data.externalClassUuidsList = valid;
  }

  const valid = r.data.externalClassUuidsList.length === 0 ? null : r;

  return { valid, invalid: invalidResponses };
}

function schemaValidation(
  entity: AddClassesToSchool.AsObject,
  log: Logger
): void {
  const errors = new Map();
  const { error } = addClassesToSchoolSchema.validate(
    entity,
    JOI_VALIDATION_SETTINGS
  );
  if (error) {
    for (const { path: p, message } of error.details) {
      const e =
        errors.get(p) ||
        new OnboardingError(
          MachineError.VALIDATION,
          `Adding classes to school failed validation`,
          Category.REQUEST,
          log,
          [...BASE_PATH, 'addClassesToSchool', ...p.map((s) => `${s}`)]
        );
      e.details.push(message);
      errors.set(p, e);
    }
  }
  if (errors.size > 0) throw new Errors(Array.from(errors.values()));
}

export const addClassesToSchoolSchema = Joi.object({
  externalSchoolUuid: Joi.string()
    .guid({ version: ['uuidv4'] })
    .required(),

  externalClassUuidsList: Joi.array()
    .min(1)
    .items(Joi.string().guid({ version: ['uuidv4'] }))
    .required(),
});
