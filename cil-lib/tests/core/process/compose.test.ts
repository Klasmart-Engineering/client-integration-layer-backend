import chai, { expect } from 'chai';
import cp from 'chai-as-promised';
import { Logger } from 'pino';

import { Operation } from '../../../src';
import { compose, Result } from '../../../src/lib/core/process';
import { Organization, Response } from '../../../src/lib/protos';
import {
  IdTracked,
  OnboardingOperation,
} from '../../../src/lib/utils/parseBatchRequests';
import { LOG_STUB } from '../../validation/util';

chai.use(cp);

describe('Core processing app flow', () => {
  describe('compose function should', () => {
    interface Te extends ReturnType<Organization['toObject']> {
      custom: string;
    }
    type T = IdTracked<Organization, Te>;
    type U = Organization.AsObject;
    const data: IdTracked<Organization, Te>[] = [];
    let validate: (data: T[]) => Promise<[Result<T>, Logger]>;
    let sendRequest: (data: T[]) => Promise<[Result<Te>, Logger]>;
    let store: (data: Te[]) => Promise<Response[]>;

    beforeEach(() => {
      validate = (_: T[]) =>
        Promise.resolve([{ invalid: [], valid: [] }, LOG_STUB]);
      sendRequest = (_: T[]) =>
        Promise.resolve([{ invalid: [], valid: [] }, LOG_STUB]);
      store = (_: U[]) => Promise.resolve([] as Response[]);
    });

    it('not throw an error if the validate function errors', () => {
      validate = () => Promise.reject(new Error('Oh Dear'));
      return expect(
        compose(validate, sendRequest, store, data, Operation.UNKNOWN, LOG_STUB)
      ).to.be.fulfilled;
    });

    it('not throw an error if the sendRequest function errors', () => {
      sendRequest = () => Promise.reject(new Error('Oh Dear'));
      return expect(
        compose(validate, sendRequest, store, data, Operation.UNKNOWN, LOG_STUB)
      ).to.be.fulfilled;
    });

    it('not throw an error if the store function errors', () => {
      store = () => Promise.reject(new Error('Oh Dear'));
      return expect(
        compose(validate, sendRequest, store, data, Operation.UNKNOWN, LOG_STUB)
      ).to.be.fulfilled;
    });
  });
});
