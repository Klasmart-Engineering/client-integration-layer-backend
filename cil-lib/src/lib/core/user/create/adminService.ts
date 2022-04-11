import { Logger } from 'pino';

import {
  Category,
  Errors,
  INTERNAL_SERVER_ERROR_PROTOBUF,
  MachineError,
  OnboardingError,
} from '../../../errors';
import { Entity, Response, User } from '../../../protos';
import { AdminService } from '../../../services';
import { UserDupeError } from '../../../services/adminService';
import { CreateUserInput } from '../../../services/adminService/users';
import { protoGenderToString } from '../../../types/gender';
import { requestIdToProtobuf } from '../../batchRequest';
import { Result } from '../../process';

import { IncomingData } from '.';

export async function sendRequest(
  users: IncomingData[],
  log: Logger
): Promise<[Result<IncomingData>, Logger]> {
  let invalid: Response[] = [];
  try {
    const admin = await AdminService.getInstance();
    const results = await admin.createUsers(
      users.map(({ data }) => createUserInput(data, log)),
      log
    );
    return [
      {
        valid: usersWithKidsloopUuids(results, mapUsers(users), log),
        invalid: [],
      },
      log,
    ];
  } catch (error) {
    if (error instanceof UserDupeError) {
      const userDupes = error.getDupes();
      const retries = users
        .filter((userRequest) => {
          return !userDupes.has(dupeUserKey(userRequest.data));
        })
        .map((user) => createUserInput(user.data, log));

      invalid = invalid.concat(
        users
          .filter((user) => userDupes.has(dupeUserKey(user.data)))
          .map((user) => {
            return new Response()
              .setEntity(Entity.USER)
              .setEntityId(user.protobuf.getExternalUuid())
              .setRequestId(requestIdToProtobuf(user.requestId))
              .setErrors(
                new OnboardingError(
                  MachineError.ENTITY_ALREADY_EXISTS,
                  `User already created`,
                  Category.REQUEST,
                  log
                ).toProtobufError()
              )
              .setSuccess(false);
          })
      );

      if (retries.length > 0) {
        try {
          const admin = await AdminService.getInstance();
          const results = await admin.createUsers(retries, log);
          return [
            {
              valid: usersWithKidsloopUuids(results, mapUsers(users), log),
              invalid,
            },
            log,
          ];
        } catch (error) {
          invalid = invalid.concat(internalServerErrors(users, error));
        }
      }
    }
  }
  return [{ valid: [], invalid }, log];
}

function mapUsers(users: IncomingData[]) {
  const incomingRequest = new Map<string, IncomingData>();
  for (const user of users) {
    const key = userKey(user.data);
    incomingRequest.set(key, user);
  }
  return incomingRequest;
}

function internalServerErrors(
  users: IncomingData[],
  error: unknown
): Response[] {
  const invalid = [];
  for (const user of users) {
    const r = new Response()
      .setEntity(Entity.USER)
      .setEntityId(user.protobuf.getExternalUuid())
      .setRequestId(requestIdToProtobuf(user.requestId))
      .setSuccess(false);
    if (error instanceof Errors || error instanceof OnboardingError) {
      r.setErrors(error.toProtobufError());
    } else {
      r.setErrors(INTERNAL_SERVER_ERROR_PROTOBUF);
    }
    invalid.push(r);
  }
  return invalid;
}

function usersWithKidsloopUuids(
  results: {
    id: string;
    givenName: string;
    familyName: string;
    email?: string | undefined;
    phone?: string | undefined;
    username?: string | undefined;
  }[],
  incomingRequest: Map<string, IncomingData>,
  log: Logger
): IncomingData[] {
  for (const result of results) {
    const key = adminServiceUserKey(result);
    const user = incomingRequest.get(key);
    if (!user)
      throw new OnboardingError(
        MachineError.WRITE,
        `Received a user that we didn't try and add`,
        Category.ADMIN_SERVICE,
        log,
        [],
        {},
        [
          `Please speak to someone in the admin service team, this really shouldn't happen`,
        ]
      );
    user.data.kidsloopUserUuid = result.id;
  }
  return Array.from(incomingRequest.values()).filter(
    (incoming) => incoming.data.kidsloopUserUuid
  );
}

export function adminServiceUserKey(result: {
  id: string;
  givenName: string;
  familyName: string;
  email?: string | undefined;
  phone?: string | undefined;
  username?: string | undefined;
}) {
  return `${result.givenName}|${result.familyName}|${
    result.email?.toLowerCase() ?? ''
  }|${result.phone ?? ''}|${result.username ?? ''}`;
}

export function userKey(user: Partial<ReturnType<User['toObject']> & User>) {
  return `${user.givenName}|${user.familyName}|${user.email?.toLowerCase()}|${
    user.phone
  }|${user.username}`;
}

export function dupeUserKey(
  user: Partial<ReturnType<User['toObject']> & User>
) {
  if (user.username) {
    return `${user.givenName}|${user.familyName}|||${user.username}`;
  }
  if (user.email) {
    return `${user.givenName}|${
      user.familyName
    }|${user.email?.toLowerCase()}||`;
  }
  return `${user.givenName}|${user.familyName}||${user.phone}|`;
}

function createUserInput(
  user: Partial<ReturnType<User['toObject']> & User>,
  log: Logger
): CreateUserInput {
  const createUserInput: CreateUserInput = {
    givenName: user.givenName!,
    familyName: user.familyName!,
    gender: protoGenderToString(user.gender!, log),
  };

  if (user.username && user.username.length > 0) {
    createUserInput.username = user.username;
  }

  if (user.dateOfBirth && user.dateOfBirth.length > 0) {
    createUserInput.dateOfBirth = user.dateOfBirth;
  }

  if (user.email && user.email.length > 0) {
    createUserInput.contactInfo = {
      email: user.email,
    };
  }
  if (user.phone && user.phone.length > 0) {
    createUserInput.contactInfo = {
      ...(createUserInput.contactInfo || {}),
      phone: user.phone,
    };
  }
  return createUserInput;
}
