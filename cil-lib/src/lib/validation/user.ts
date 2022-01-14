import Joi from 'joi';

import { VALIDATION_RULES } from './validationRules';

// const emailOrPhone = (value: User.AsObject, helpers: CustomHelpers) => {
//   console.log('UN', value);
//   const emailIsValid = Joi.string()
//     .email()
//     .max(VALIDATION_RULES.EMAIL_MAX_LENGTH)
//     .validate(value.email);

//   const phoneIsValid = Joi.string()
//     .regex(VALIDATION_RULES.PHONE_REGEX)
//     .validate(value.phone);
//   if (emailIsValid.error === undefined && phoneIsValid === undefined) return;
//   value;

//   if (value.phone === '' && emailIsValid.error === undefined) return value;
//   if (value.email === '' && phoneIsValid.error === undefined) return value;
//   if (emailIsValid.error) {
//     const e = emailIsValid.error.details.filter(
//       (e) => e.type !== 'string.empty'
//     );
//     for (const err of e) {
//       helpers.error(err.type);
//     }
//   }
//   if (phoneIsValid.error) {
//     const e = phoneIsValid.error.details.filter(
//       (e) => e.type !== 'string.empty'
//     );
//     for (const err of e) {
//       helpers.error(err.type);
//     }
//   }

//   return value;
// };

export const userSchema = Joi.object({
  externalUuid: Joi.string().guid({ version: ['uuidv4'] }),

  externalOrganizationUuid: Joi.string()
    .guid({ version: ['uuidv4'] })
    .required(),

  externalSchoolUuid: Joi.string()
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

  // Due to niche rules, need to validate in ValidationWrapper.validate
  email: Joi.any(),
  phone: Joi.any(),

  dateOfBirth: Joi.date().max('now'),

  // 0 = Male, 1 = Female
  gender: Joi.number().min(0).max(1).required(),
});
