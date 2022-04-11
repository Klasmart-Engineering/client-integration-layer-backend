import { Logger } from 'pino';

import { Category, MachineError, OnboardingError } from '../../../errors';
import { Entity as PBEntity, Response } from '../../../protos';
import { requestIdToProtobuf } from '../../batchRequest';
import { Result } from '../../process';

import { IncomingData } from '.';

const getKey = ({ data }: IncomingData): string =>
  `${data.givenName || ''}|${data.familyName || ''}|${data.username || ''}|${
    data.email || ''
  }|${data.phone || ''}`;

export async function prepare(
  input: IncomingData[],
  log: Logger
): Promise<[Result<IncomingData>, Logger]> {
  const validUsers = new Map<string, IncomingData>();
  const duplicatedNames = new Map<string, string>();
  const invalid: Response[] = [];
  for (const user of input) {
    const key = getKey(user);
    const otherExternalUuid = duplicatedNames.get(key);

    // Handles the scenario where the unique identifiers of the provided user already exist in this batch
    // but the duplicated user has a different external uuid
    if (otherExternalUuid && otherExternalUuid !== user.data.externalUuid) {
      invalid.push(
        new Response()
          .setEntity(PBEntity.USER)
          .setRequestId(requestIdToProtobuf(user.requestId))
          .setEntityId(user.data.externalUuid!)
          .setErrors(
            new OnboardingError(
              MachineError.VALIDATION,
              `A user with the provided givenName, familyName and identifier (username, email or phone) already exists with a different externalUuid`,
              Category.REQUEST,
              log,
              [],
              {},
              [`UUID of already existing user: ${otherExternalUuid}`]
            ).toProtobufError()
          )
          .setSuccess(false)
      );
      continue;
    }

    // Handles the scenario where we have duplicate users provided with the same external uuid
    if (validUsers.has(user.data.externalUuid!)) {
      const externalUuid = user.data.externalUuid!;
      const alreadySeenUser = validUsers.get(user.data.externalUuid!)!;

      if (
        alreadySeenUser.data.givenName !== user.data.givenName ||
        alreadySeenUser.data.familyName !== user.data.familyName
      ) {
        invalid.push(
          new Response()
            .setEntity(PBEntity.USER)
            .setRequestId(requestIdToProtobuf(user.requestId))
            .setEntityId(user.data.externalUuid!)
            .setErrors(
              new OnboardingError(
                MachineError.REQUEST,
                `User with ID ${externalUuid} has been added twice with different names`,
                Category.REQUEST,
                log,
                [],
                {},
                [
                  `If you want to add multiple profiles for the same user, they must have different 'externalUuids'`,
                ]
              ).toProtobufError()
            )
            .setSuccess(false)
        );
        continue;
      }

      if (user.data.username && user.data.username.length > 0) {
        if (
          alreadySeenUser.data.username &&
          alreadySeenUser.data.username !== user.data.username
        ) {
          invalid.push(
            new Response()
              .setEntity(PBEntity.USER)
              .setRequestId(requestIdToProtobuf(user.requestId))
              .setEntityId(externalUuid)
              .setErrors(
                new OnboardingError(
                  MachineError.REQUEST,
                  `Received two different usernames for user with ID ${externalUuid}`,
                  Category.REQUEST,
                  log
                ).toProtobufError()
              )
              .setSuccess(false)
          );
          validUsers.delete(externalUuid!);
          continue;
        }
        alreadySeenUser.data.username = user.data.username;
        alreadySeenUser.protobuf.setUsername(user.data.username!);
      }

      if (user.data.email && user.data.email.length > 0) {
        if (
          alreadySeenUser.data.email &&
          alreadySeenUser.data.email !== user.data.email
        ) {
          invalid.push(
            new Response()
              .setEntity(PBEntity.USER)
              .setRequestId(requestIdToProtobuf(user.requestId))
              .setEntityId(externalUuid)
              .setErrors(
                new OnboardingError(
                  MachineError.REQUEST,
                  `Received two different emails for user with ID ${externalUuid}`,
                  Category.REQUEST,
                  log
                ).toProtobufError()
              )
              .setSuccess(false)
          );
          validUsers.delete(externalUuid!);
          continue;
        }
        alreadySeenUser.data.email = user.data.email;
        alreadySeenUser.protobuf.setEmail(user.data.email!);
      }

      if (user.data.phone && user.data.phone.length > 0) {
        if (
          alreadySeenUser.data.phone &&
          alreadySeenUser.data.phone !== user.data.phone
        ) {
          invalid.push(
            new Response()
              .setEntity(PBEntity.USER)
              .setRequestId(requestIdToProtobuf(user.requestId))
              .setEntityId(externalUuid)
              .setErrors(
                new OnboardingError(
                  MachineError.REQUEST,
                  `Received two different phone numbers for user with ID ${externalUuid}`,
                  Category.REQUEST,
                  log
                ).toProtobufError()
              )
              .setSuccess(false)
          );
          validUsers.delete(externalUuid!);
          continue;
        }
        alreadySeenUser.data.phone = user.data.phone;
        alreadySeenUser.protobuf.setPhone(user.data.phone!);
      }

      continue;
    }
    validUsers.set(user.data.externalUuid!, user);
    duplicatedNames.set(key, user.data.externalUuid!);
  }

  return [{ valid: Array.from(validUsers.values()), invalid }, log];
}
