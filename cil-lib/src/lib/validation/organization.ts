import Joi from 'joi';

import { VALIDATION_RULES } from './validationRules';

export const organizationSchema = Joi.object({
  name: Joi.string()
    .min(VALIDATION_RULES.ORGANIZATION_NAME_MIN_LENGTH)
    .max(VALIDATION_RULES.ORGANIZATION_NAME_MAX_LENGTH)
    .required(),

  clientUuid: Joi.string()
    .guid({ version: ['uuidv4'] })
    .required(),
});
