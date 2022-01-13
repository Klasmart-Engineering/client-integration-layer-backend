import Joi from 'joi';

import { VALIDATION_RULES } from './validationRules';

export const schoolSchema = Joi.object({
  clientUuid: Joi.string().guid({ version: ['uuidv4'] }),

  clientOrganizationUuid: Joi.string()
    .guid({ version: ['uuidv4'] })
    .required(),

  name: Joi.string()
    .min(VALIDATION_RULES.SCHOOL_NAME_MIN_LENGTH)
    .max(VALIDATION_RULES.SCHOOL_NAME_MAX_LENGTH)
    .required(),

  shortCode: Joi.string().max(VALIDATION_RULES.SHORTCODE_MAX_LENGTH).required(),

  programIdsList: Joi.array()
    .items(Joi.string().guid({ version: ['uuidv4'] }))
    .min(1)
    .unique()
    .required(),
});
