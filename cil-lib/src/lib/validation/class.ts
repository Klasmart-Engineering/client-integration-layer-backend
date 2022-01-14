import Joi from 'joi';

import { VALIDATION_RULES } from './validationRules';

export const classSchema = Joi.object({
  externalUuid: Joi.string().guid({ version: ['uuidv4'] }),

  externalOrganizationUuid: Joi.string()
    .guid({ version: ['uuidv4'] })
    .required(),

  name: Joi.string()
    .min(VALIDATION_RULES.CLASS_NAME_MIN_LENGTH)
    .max(VALIDATION_RULES.CLASS_NAME_MAX_LENGTH)
    .required(),

  externalSchoolUuid: Joi.string()
    .guid({ version: ['uuidv4'] })
    .required(),
});
