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
    /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/,

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
