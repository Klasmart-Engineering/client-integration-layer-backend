import { Logger } from 'pino';

import {
  Category,
  Errors,
  INTERNAL_SERVER_ERROR_PROTOBUF,
  MachineError,
  OnboardingError,
} from '../../../errors';
import { Entity, Response } from '../../../protos';
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
    const result = await admin.createUsers(
      users.map(({ data }) => {
        const user: CreateUserInput = {
          givenName: data.givenName!,
          familyName: data.familyName!,
          contactInfo: {
            phone: data.phone,
            email: data.email,
          },
          gender: protoGenderToString(data.gender!, log),
        };

        if (data.username && data.username.length > 0) {
          user.username = data.username;
        }

        if (data.dateOfBirth && data.dateOfBirth.length > 0) {
          user.dateOfBirth = data.dateOfBirth;
        }

        return user;
      }),
      log
    );

    const m = new Map<string, IncomingData>();
    for (const s of users) {
      const key = `${s.data.givenName}|${s.data.familyName}|${s.data.email}|${s.data.phone}`;
      m.set(key, s);
    }

    for (const s of result) {
      const key = `${s.givenName}|${s.familyName}|${s.email}|${s.phone}`;
      const user = m.get(key);
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
      user.data.kidsloopUserUuid = s.id;
    }
    return [{ valid: Array.from(m.values()), invalid: [] }, log];
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
