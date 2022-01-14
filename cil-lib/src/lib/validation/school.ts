import Joi from 'joi';

import { VALIDATION_RULES } from './validationRules';

export const schoolSchema = Joi.object({
  externalUuid: Joi.string().guid({ version: ['uuidv4'] }),

  externalOrganizationUuid: Joi.string()
    .guid({ version: ['uuidv4'] })
    .required(),

  name: Joi.string()
    .min(VALIDATION_RULES.SCHOOL_NAME_MIN_LENGTH)
    .max(VALIDATION_RULES.SCHOOL_NAME_MAX_LENGTH)
    .required(),

  shortCode: Joi.string().min(VALIDATION_RULES.SHORTCODE_MIN_LENGTH)
  .max(VALIDATION_RULES.SHORTCODE_MAX_LENGTH).required(),
});
