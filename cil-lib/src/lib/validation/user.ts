import Joi from 'joi';

import { VALIDATION_RULES } from './validationRules';

export const userSchema = Joi.object({
  clientUuid: Joi.string().guid({ version: ['uuidv4'] }),

  clientOrganizationUuid: Joi.string()
    .guid({ version: ['uuidv4'] })
    .required(),

  clientSchoolUuid: Joi.string()
    .guid({ version: ['uuidv4'] })
    .required(),

  givenName: Joi.string()
    .min(VALIDATION_RULES.USER_NAME_MIN_LENGTH)
    .max(VALIDATION_RULES.USER_NAME_MAX_LENGTH)
    .regex(VALIDATION_RULES.ALPHANUMERIC)
    .required(),

  familyName: Joi.string()
    .min(VALIDATION_RULES.USER_NAME_MIN_LENGTH)
    .max(VALIDATION_RULES.USER_NAME_MAX_LENGTH)
    .regex(VALIDATION_RULES.ALPHANUMERIC)
    .required(),

  username: Joi.string().required(),

  email: Joi.string().email().max(VALIDATION_RULES.EMAIL_MAX_LENGTH),

  phone: Joi.string().regex(VALIDATION_RULES.PHONE_REGEX),

  dateOfBirth: Joi.string().regex(VALIDATION_RULES.DOB_REGEX),

  gender: Joi.string()
    .regex(VALIDATION_RULES.ALPHANUMERIC)
    .min(VALIDATION_RULES.GENDER_MIN_LENGTH)
    .max(VALIDATION_RULES.GENDER_MAX_LENGTH)
    .required(),

  programIdsList: Joi.array()
    .items(Joi.string().guid({ version: ['uuidv4'] }))
    .unique()
    .required(),

  rolesIdsList: Joi.array()
    .items(Joi.string().guid({ version: ['uuidv4'] }))
    .min(1)
    .unique()
    .required(),
}).or('email', 'phone');
