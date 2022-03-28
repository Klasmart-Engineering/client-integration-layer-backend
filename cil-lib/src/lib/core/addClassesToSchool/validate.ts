import Joi from 'joi';
import { Logger } from 'pino';

import { Class, JOI_VALIDATION_SETTINGS, Link } from '../../..';
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
  EntityAlreadyExistsError,
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
  const valid = [];
  const invalid = [];

  for (const d of data) {
    try {
      const result = await validate(d, log);
      
      valid.push(result.valid);

      // create responses for already linked classes
      for (const classId of result.invalidLink) {
        const resp = new Response()
            .setSuccess(false)
            .setRequestId(requestIdToProtobuf(d.requestId))
            .setEntity(PbEntity.CLASS)
            .setEntityId(classId)
            .setErrors(
              new PbError().setEntityAlreadyExists(
                new EntityAlreadyExistsError().setDetailsList([
                  `Classes with id ${classId} already exist`, 
                ])
              )
            );
            invalid.push(resp);
      }
      // create responses for non-existed classes
      for (const i of result.invalidNotExist) {
        const resp = new Response()
          .setSuccess(false)
          .setRequestId(requestIdToProtobuf(d.requestId))
          .setEntity(PbEntity.CLASS)
          .setEntityId(i)
          .setErrors(
            new PbError().setEntityDoesNotExist(
              new EntityDoesNotExistError().setDetailsList([
                `Unable to find class with id ${i}`,
              ])
            )
          );
        invalid.push(resp);
      }
    } catch (error) {
      const e = convertErrorToProtobuf(error, log);

      if (d.protobuf.getExternalClassUuidsList()?.length == 0) {
        const resp = new Response()
          .setSuccess(false)
          .setRequestId(requestIdToProtobuf(d.requestId))
          .setEntity(PbEntity.SCHOOL)
          .setEntityId(d.protobuf.getExternalSchoolUuid())
          .setErrors(e);
        invalid.push(resp);
      } else {
        for (const classId of d.protobuf.getExternalClassUuidsList()) {
          const resp = new Response()
            .setSuccess(false)
            .setRequestId(requestIdToProtobuf(d.requestId))
            .setEntity(PbEntity.CLASS)
            .setEntityId(classId)
            .setErrors(e);
          invalid.push(resp);
        }
      }
    }
  }

  return [{ valid, invalid }, log];
}

async function validate(
  r: IncomingData,
  log: Logger
): Promise<{ valid: IncomingData; invalidNotExist: string[], invalidLink: string[] }> {
  const { protobuf } = r;

  schemaValidation(protobuf.toObject(), log);
  const schoolId = protobuf.getExternalSchoolUuid();
  const classIds = protobuf.getExternalClassUuidsList();

  const { valid, invalid} = await Class.areValid(classIds, log);
  if (valid.length === 0)
    throw new OnboardingError(
      MachineError.VALIDATION,
      `None of the provided class ids were valid`,
      Category.REQUEST,
      log
    );
  
  // Check if the valid classes already linked to the school 
  const {validToPass, invalidLink} = await Link.classesBelongToSchool(valid, schoolId, log);
  
  protobuf.setExternalClassUuidsList(validToPass);
  r.data.externalClassUuidsList = validToPass;

  // Checking that both sets of ids are valid are covered by this
  await Link.shareTheSameOrganization(log, [schoolId], valid);
  
  
  return { valid: r, invalidNotExist: invalid, invalidLink: invalidLink };
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
