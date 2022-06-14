import Joi from 'joi';
import { Logger } from 'pino';

import {
  Context,
  JOI_VALIDATION_SETTINGS,
  VALIDATION_RULES,
} from '../../../..';
import {
  BASE_PATH,
  Category,
  convertErrorToProtobuf,
  Errors,
  MachineError,
  OnboardingError,
} from '../../../errors';
import { Entity as PbEntity, User as PbUser, Response } from '../../../protos';
import { Entity } from '../../../types';
import { requestIdToProtobuf } from '../../batchRequest';
import { Result } from '../../process';

import { IncomingData } from '.';

export async function validateMany(
  data: IncomingData[],
  log: Logger
): Promise<[Result<IncomingData>, Logger]> {
  const valid = [];
  const invalid = [];
  for (const d of data) {
    try {
      valid.push(await validate(d, log));
    } catch (error) {
      const e = convertErrorToProtobuf(error, log);
      const resp = new Response()
        .setSuccess(false)
        .setRequestId(requestIdToProtobuf(d.requestId))
        .setEntity(PbEntity.USER)
        .setEntityId(d.protobuf.getExternalUuid())
        .setErrors(e);
      invalid.push(resp);
    }
  }
  return [{ valid, invalid }, log];
}

async function validate(r: IncomingData, log: Logger): Promise<IncomingData> {
  const { protobuf } = r;
  const entity = protobuf.toObject();
  const newLogger = log.child({
    entityId: entity.externalUuid,
    entity: Entity.USER,
  });

  try {
    // The Admin Service has an additional step they go through to normalize
    // a phone number prior to processing it.
    // Although this isn't the most ideal place to put it, it's the easiest
    // place to put it for now.
    const normalizedPhoneNumber = normalizePhoneNumber(entity.phone);
    r.data.phone = normalizedPhoneNumber;
    r.protobuf.setPhone(normalizedPhoneNumber);
  } catch (error) {
    const msg = error instanceof Error ? error.message : `${error}`;
    throw new OnboardingError(
      MachineError.VALIDATION,
      msg,
      Category.REQUEST,
      log,
      [...BASE_PATH, 'user', 'phone']
    );
  }

  schemaValidation(entity, log);
  await entityValidation(entity, newLogger);
  return r;
}

function schemaValidation(entity: PbUser.AsObject, log: Logger): void {
  const errors = new Map();
  const { error } = userSchema.validate(entity, JOI_VALIDATION_SETTINGS);
  if (error) {
    for (const { path: p, message } of error.details) {
      const e =
        errors.get(p) ||
        new OnboardingError(
          MachineError.VALIDATION,
          `${Entity.USER} failed validation`,
          Category.REQUEST,
          log,
          [...BASE_PATH, 'user', ...p.map((s) => `${s}`)]
        );
      e.details.push(message);
      errors.set(p, e);
    }
  }

  const { email, phone, username } = entity;
  const phoneRegex = new RegExp(VALIDATION_RULES.PHONE_REGEX);
  const emailRegex = new RegExp(VALIDATION_RULES.EMAIL_REGEX);
  const phoneIsValid = phoneRegex.exec(phone);
  const emailIsValid = emailRegex.exec(email);

  if (email.length === 0 && phone.length === 0 && username.length === 0) {
    errors.set(
      'phone',
      new OnboardingError(
        MachineError.VALIDATION,
        `${Entity.USER} failed validation`,
        Category.REQUEST,
        log,
        [...BASE_PATH, 'user', '[email | phone | username ]'],
        {},
        [
          'Missing Phone, Email and Username must provide at least one of these values',
        ]
      )
    );
  }

  if (email.length > 0 && emailIsValid === null) {
    errors.set(
      'email',
      new OnboardingError(
        MachineError.VALIDATION,
        `${Entity.USER} failed validation`,
        Category.REQUEST,
        log,
        [...BASE_PATH, 'user', 'email'],
        {},
        ['Email is invalid']
      )
    );
  }

  if (phone.length > 0 && phoneIsValid === null) {
    errors.set(
      'phone',
      new OnboardingError(
        MachineError.VALIDATION,
        `${Entity.USER} failed validation`,
        Category.REQUEST,
        log,
        [...BASE_PATH, 'user', 'phone'],
        {},
        ['phone is invalid']
      )
    );
  }
  if (errors.size > 0) throw new Errors(Array.from(errors.values()));
}

async function entityValidation(
  request: PbUser.AsObject,
  log: Logger
): Promise<string[]> {
  const ctx = await Context.getInstance();
  await ctx.userDoesNotExist(request.externalUuid, log);

  // If the user does not exist then we validate the external org id & role names.
  const organizationUuid = request.externalOrganizationUuid;
  const roleNames = new Set(request.roleIdentifiersList);

  await ctx.organizationIdIsValid(organizationUuid, log);

  const roles = await ctx.rolesAreValid(
    Array.from(roleNames),
    organizationUuid,
    log
  );
  // Returning the kidsloop role id, as in the future these would be required for the streams.
  return roles.map((role) => role.id);
}

export const userSchema = Joi.object({
  externalUuid: Joi.string()
    .guid({ version: ['uuidv4'] })
    .required(),

  externalOrganizationUuid: Joi.string()
    .guid({ version: ['uuidv4'] })
    .required(),

  givenName: Joi.string()
    .min(VALIDATION_RULES.USER_GIVEN_FAMILY_NAME_MIN_LENGTH)
    .max(VALIDATION_RULES.USER_GIVEN_FAMILY_NAME_MAX_LENGTH)
    .regex(VALIDATION_RULES.ALPHANUMERIC)
    .required()
    .messages({
      "string.pattern.base": `"givenName" {givenName} must only contain letters, numbers, space and & / , - . `
    }),

  familyName: Joi.string()
    .min(VALIDATION_RULES.USER_GIVEN_FAMILY_NAME_MIN_LENGTH)
    .max(VALIDATION_RULES.USER_GIVEN_FAMILY_NAME_MAX_LENGTH)
    .regex(VALIDATION_RULES.ALPHANUMERIC)
    .required()
    .messages({
      "string.pattern.base": `"familyName" {familyName} must only contain letters, numbers, space and & / , - . `
    }),

  username: Joi.string()
    .allow('')
    .max(VALIDATION_RULES.USERNAME_MAX_LENGTH)
    .alphanum()
    .required(),

  email: Joi.any(),
  phone: Joi.any(),

  dateOfBirth: Joi.string().allow('').regex(VALIDATION_RULES.DOB_REGEX),

  // 1 = Male, 2 = Female
  gender: Joi.number().min(1).max(2).required(),

  shortCode: Joi.string()
    .allow('')
    .max(VALIDATION_RULES.SHORTCODE_MAX_LENGTH)
    .alphanum(),

  roleIdentifiersList: Joi.array()
    .min(1)
    .items(
      Joi.string().min(1).max(VALIDATION_RULES.ROLE_NAME_MAX_LENGTH).required()
    )
    .required(),
});

function normalizePhoneNumber(phoneNumber: string) {
  if (phoneNumber.length === 0) return '';
  let clean = phoneNumber.replace(/[() -]/g, '');

  if (clean.startsWith('+')) {
    clean = clean.substr(1);
  } else if (clean.startsWith('00')) {
    clean = clean.substr(2);
  } else {
    throw new Error(
      "The phone number doesn't appear to have a international format"
    );
  }

  if (clean.length == 0) {
    throw new Error('The phone number is invalid');
  }

  const { countryCallCode, localPhoneNumber } =
    getCountryCallCodeFromString(clean);

  const localPhoneNumberWithoutLeadingZeros = localPhoneNumber.replace(
    /^0+/,
    ''
  );
  return `+${countryCallCode}${localPhoneNumberWithoutLeadingZeros}`;
}

function getCountryCallCodeFromString(phoneNumber: string): {
  countryCallCode: string;
  localPhoneNumber: string;
} {
  const maxLengthCountryCallCode = 3;
  for (let i = maxLengthCountryCallCode; i >= 0; i--) {
    const countryCode = phoneNumber.substr(0, i);
    if (countryCodes.has(countryCode)) {
      return {
        countryCallCode: countryCode,
        localPhoneNumber: phoneNumber.substr(i),
      };
    }
  }
  throw new Error('Unable to get the country code from the phone number');
}

const countryCodes = new Map([
  [
    '1',
    [
      'US',
      'AG',
      'AI',
      'AS',
      'BB',
      'BM',
      'BS',
      'CA',
      'DM',
      'DO',
      'GD',
      'GU',
      'JM',
      'KN',
      'KY',
      'LC',
      'MP',
      'MS',
      'PR',
      'SX',
      'TC',
      'TT',
      'VC',
      'VG',
      'VI',
    ],
  ],
  ['7', ['RU', 'KZ']],
  ['20', ['EG']],
  ['27', ['ZA']],
  ['30', ['GR']],
  ['31', ['NL']],
  ['32', ['BE']],
  ['33', ['FR']],
  ['34', ['ES']],
  ['36', ['HU']],
  ['39', ['IT']],
  ['40', ['RO']],
  ['41', ['CH']],
  ['43', ['AT']],
  ['44', ['GB', 'GG', 'IM', 'JE']],
  ['45', ['DK']],
  ['46', ['SE']],
  ['47', ['NO', 'SJ']],
  ['48', ['PL']],
  ['49', ['DE']],
  ['51', ['PE']],
  ['52', ['MX']],
  ['53', ['CU']],
  ['54', ['AR']],
  ['55', ['BR']],
  ['56', ['CL']],
  ['57', ['CO']],
  ['58', ['VE']],
  ['60', ['MY']],
  ['61', ['AU', 'CC', 'CX']],
  ['62', ['ID']],
  ['63', ['PH']],
  ['64', ['NZ']],
  ['65', ['SG']],
  ['66', ['TH']],
  ['81', ['JP']],
  ['82', ['KR']],
  ['84', ['VN']],
  ['86', ['CN']],
  ['90', ['TR']],
  ['91', ['IN']],
  ['92', ['PK']],
  ['93', ['AF']],
  ['94', ['LK']],
  ['95', ['MM']],
  ['98', ['IR']],
  ['211', ['SS']],
  ['212', ['MA', 'EH']],
  ['213', ['DZ']],
  ['216', ['TN']],
  ['218', ['LY']],
  ['220', ['GM']],
  ['221', ['SN']],
  ['222', ['MR']],
  ['223', ['ML']],
  ['224', ['GN']],
  ['225', ['CI']],
  ['226', ['BF']],
  ['227', ['NE']],
  ['228', ['TG']],
  ['229', ['BJ']],
  ['230', ['MU']],
  ['231', ['LR']],
  ['232', ['SL']],
  ['233', ['GH']],
  ['234', ['NG']],
  ['235', ['TD']],
  ['236', ['CF']],
  ['237', ['CM']],
  ['238', ['CV']],
  ['239', ['ST']],
  ['240', ['GQ']],
  ['241', ['GA']],
  ['242', ['CG']],
  ['243', ['CD']],
  ['244', ['AO']],
  ['245', ['GW']],
  ['246', ['IO']],
  ['247', ['AC']],
  ['248', ['SC']],
  ['249', ['SD']],
  ['250', ['RW']],
  ['251', ['ET']],
  ['252', ['SO']],
  ['253', ['DJ']],
  ['254', ['KE']],
  ['255', ['TZ']],
  ['256', ['UG']],
  ['257', ['BI']],
  ['258', ['MZ']],
  ['260', ['ZM']],
  ['261', ['MG']],
  ['262', ['RE', 'YT']],
  ['263', ['ZW']],
  ['264', ['NA']],
  ['265', ['MW']],
  ['266', ['LS']],
  ['267', ['BW']],
  ['268', ['SZ']],
  ['269', ['KM']],
  ['290', ['SH', 'TA']],
  ['291', ['ER']],
  ['297', ['AW']],
  ['298', ['FO']],
  ['299', ['GL']],
  ['350', ['GI']],
  ['351', ['PT']],
  ['352', ['LU']],
  ['353', ['IE']],
  ['354', ['IS']],
  ['355', ['AL']],
  ['356', ['MT']],
  ['357', ['CY']],
  ['358', ['FI', 'AX']],
  ['359', ['BG']],
  ['370', ['LT']],
  ['371', ['LV']],
  ['372', ['EE']],
  ['373', ['MD']],
  ['374', ['AM']],
  ['375', ['BY']],
  ['376', ['AD']],
  ['377', ['MC']],
  ['378', ['SM']],
  ['379', ['VA']],
  ['380', ['UA']],
  ['381', ['RS']],
  ['382', ['ME']],
  ['383', ['XK']],
  ['385', ['HR']],
  ['386', ['SI']],
  ['387', ['BA']],
  ['389', ['MK']],
  ['420', ['CZ']],
  ['421', ['SK']],
  ['423', ['LI']],
  ['500', ['FK']],
  ['501', ['BZ']],
  ['502', ['GT']],
  ['503', ['SV']],
  ['504', ['HN']],
  ['505', ['NI']],
  ['506', ['CR']],
  ['507', ['PA']],
  ['508', ['PM']],
  ['509', ['HT']],
  ['590', ['GP', 'BL', 'MF']],
  ['591', ['BO']],
  ['592', ['GY']],
  ['593', ['EC']],
  ['594', ['GF']],
  ['595', ['PY']],
  ['596', ['MQ']],
  ['597', ['SR']],
  ['598', ['UY']],
  ['599', ['CW', 'BQ']],
  ['670', ['TL']],
  ['672', ['NF']],
  ['673', ['BN']],
  ['674', ['NR']],
  ['675', ['PG']],
  ['676', ['TO']],
  ['677', ['SB']],
  ['678', ['VU']],
  ['679', ['FJ']],
  ['680', ['PW']],
  ['681', ['WF']],
  ['682', ['CK']],
  ['683', ['NU']],
  ['685', ['WS']],
  ['686', ['KI']],
  ['687', ['NC']],
  ['688', ['TV']],
  ['689', ['PF']],
  ['690', ['TK']],
  ['691', ['FM']],
  ['692', ['MH']],
  ['800', ['001']],
  ['808', ['001']],
  ['850', ['KP']],
  ['852', ['HK']],
  ['853', ['MO']],
  ['855', ['KH']],
  ['856', ['LA']],
  ['870', ['001']],
  ['878', ['001']],
  ['880', ['BD']],
  ['881', ['001']],
  ['882', ['001']],
  ['883', ['001']],
  ['886', ['TW']],
  ['888', ['001']],
  ['960', ['MV']],
  ['961', ['LB']],
  ['962', ['JO']],
  ['963', ['SY']],
  ['964', ['IQ']],
  ['965', ['KW']],
  ['966', ['SA']],
  ['967', ['YE']],
  ['968', ['OM']],
  ['970', ['PS']],
  ['971', ['AE']],
  ['972', ['IL']],
  ['973', ['BH']],
  ['974', ['QA']],
  ['975', ['BT']],
  ['976', ['MN']],
  ['977', ['NP']],
  ['979', ['001']],
  ['992', ['TJ']],
  ['993', ['TM']],
  ['994', ['AZ']],
  ['995', ['GE']],
  ['996', ['KG']],
  ['998', ['UZ']],
]);
