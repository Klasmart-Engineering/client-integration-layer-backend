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
import { CreateUserInput } from '../../../services/adminService/users';
import { protoGenderToString } from '../../../types/gender';
import { requestIdToProtobuf } from '../../batchRequest';
import { Result } from '../../process';

import { IncomingData } from '.';

export async function sendRequest(
  users: IncomingData[],
  log: Logger
): Promise<[Result<IncomingData>, Logger]> {
  const invalid: Response[] = [];

  try {
    const admin = await AdminService.getInstance();
    const results = await admin.createUsers(
      users.map(({ data }) => {
        const user: CreateUserInput = {
          givenName: data.givenName!,
          familyName: data.familyName!,
          gender: protoGenderToString(data.gender!, log),
        };

        if (data.username && data.username.length > 0) {
          user.username = data.username;
        }

        if (data.dateOfBirth && data.dateOfBirth.length > 0) {
          user.dateOfBirth = data.dateOfBirth;
        }

        if (
          (data.email && data.email.length > 0) ||
          (data.phone && data.phone.length > 0)
        ) {
          user.contactInfo = {
            phone: data.phone,
            email: data.email,
          };
        }

        return user;
      }),
      log
    );

    const incomingRequest = new Map<string, IncomingData>();
    for (const user of users) {
      const key = userKey(user.data);
      incomingRequest.set(key, user);
    }

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
    return [{ valid: Array.from(incomingRequest.values()), invalid: [] }, log];
  } catch (error) {
    // @TODO - We need to filter out any invalid entities or entities that
    // already exist and retry
    for (const s of users) {
      const r = new Response()
        .setEntity(Entity.USER)
        .setEntityId(s.protobuf.getExternalUuid())
        .setRequestId(requestIdToProtobuf(s.requestId))
        .setSuccess(false);
      if (error instanceof Errors || error instanceof OnboardingError) {
        r.setErrors(error.toProtobufError());
      } else {
        r.setErrors(INTERNAL_SERVER_ERROR_PROTOBUF);
      }
      invalid.push(r);
    }
  }

  return [{ valid: [], invalid }, log];
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
