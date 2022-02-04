export const VALIDATION_RULES = {
  SHORTCODE_MIN_LENGTH: 3,
  SHORTCODE_MAX_LENGTH: 16,

  ORGANIZATION_NAME_MIN_LENGTH: 3,
  ORGANIZATION_NAME_MAX_LENGTH: 30,

  SCHOOL_NAME_MIN_LENGTH: 3,
  // This will be truncated
  SCHOOL_NAME_MAX_LENGTH: 120,

  PROGRAM_NAME_MIN_LENGTH: 3,
  PROGRAM_NAME_MAX_LENGTH: 30,

  ROLE_NAME_MIN_LENGTH: 3,
  ROLE_NAME_MAX_LENGTH: 20,

  CLASS_NAME_MIN_LENGTH: 3,
  CLASS_NAME_MAX_LENGTH: 45,
  CLASS_SHORT_CODE_MAX_LENGTH: 16,

  USER_GIVEN_FAMILY_NAME_MIN_LENGTH: 2,
  // This will be truncated
  USER_GIVEN_FAMILY_NAME_MAX_LENGTH: 100,

  USERNAME_MIN_LENGTH: 2,
  // This might need to be truncated to 35
  USERNAME_MAX_LENGTH: 50,

  EMAIL_MAX_LENGTH: 250,
  EMAIL_REGEX:
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,

  PHONE_REGEX: /^\+[1-9]\d{8,14}$/,

  DOB_REGEX: /^(((0)[0-9])|((1)[0-2]))(-)\d{4}$/,

  GENDER_MIN_LENGTH: 3,
  GENDER_MAX_LENGTH: 16,

  ALPHANUMERIC: /^[A-Za-z0-9 &,'-/.]*$/,
};

export const JOI_VALIDATION_SETTINGS = Object.freeze({
  abortEarly: false,
  allowUnknown: false,
});
