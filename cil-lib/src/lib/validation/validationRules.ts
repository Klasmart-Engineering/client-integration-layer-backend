export const VALIDATION_RULES = {
  SHORTCODE_MIN_LENGTH: 3,
  SHORTCODE_MAX_LENGTH: 16,

  ORGANIZATION_NAME_MIN_LENGTH: 3,
  ORGANIZATION_NAME_MAX_LENGTH: 30,

  SCHOOL_NAME_MIN_LENGTH: 3,
  SCHOOL_NAME_MAX_LENGTH: 200,

  PROGRAM_NAME_MIN_LENGTH: 3,
  PROGRAM_NAME_MAX_LENGTH: 30,

  ROLE_NAME_MAX_LENGTH: 20,

  CLASS_NAME_MAX_LENGTH: 45,
  CLASS_NAME_MIN_LENGTH: 3,
  CLASS_SHORT_CODE_MAX_LENGTH: 16,

  CLIENT_MAX_LENGTH: 255,
  STATUS_MAX_LENGTH: 255,

  USER_NAME_MIN_LENGTH: 2,
  USER_NAME_MAX_LENGTH: 35,

  EMAIL_MAX_LENGTH: 250,
  EMAIL_REGEX:
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,

  PHONE_REGEX: /^\+[1-9]\d{8,14}$/,

  DOB_REGEX: /^(((0)[0-9])|((1)[0-2]))(-)\d{4}$/,

  GENDER_MIN_LENGTH: 3,
  GENDER_MAX_LENGTH: 16,

  ALPHANUMERIC: /^[\p{L}\d .'&/,-]*$/,
};

export const JOI_VALIDATION_SETTINGS = Object.freeze({
  abortEarly: false,
  allowUnknown: false,
});
