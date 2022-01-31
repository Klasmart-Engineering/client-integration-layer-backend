import chai, { expect } from 'chai';
import cp from 'chai-as-promised';
import { Logger } from 'pino';

import { Operation } from '../../../src';
import { ICreateOrganization } from '../../../src/lib/core';
import { compose, Result } from '../../../src/lib/core/process';
import { Response } from '../../../src/lib/protos';
import { LOG_STUB } from '../../util';

chai.use(cp);

describe('Core processing app flow', () => {
  describe('compose function should', () => {
    type T = ICreateOrganization;
    const data: ICreateOrganization[] = [];
    let validate: (data: T[]) => Promise<[Result<T>, Logger]>;
    let prepare: (data: T[]) => Promise<[Result<T>, Logger]>;
    let sendRequest: (data: T[]) => Promise<[Result<T>, Logger]>;
    let store: (data: T[]) => Promise<Response[]>;

    beforeEach(() => {
      validate = (_: T[]) =>
        Promise.resolve([{ invalid: [], valid: [] }, LOG_STUB]);
      prepare = (_: T[]) =>
        Promise.resolve([{ invalid: [], valid: [] }, LOG_STUB]);
      sendRequest = (_: T[]) =>
        Promise.resolve([{ invalid: [], valid: [] }, LOG_STUB]);
      store = (_: T[]) => Promise.resolve([] as Response[]);
    });

    it('not throw an error if the validate function errors', () => {
      validate = () => Promise.reject(new Error('Oh Dear'));
      return expect(
        compose(
          validate,
          prepare,
          sendRequest,
          store,
          data,
          Operation.UNKNOWN,
          LOG_STUB
        )
      ).to.be.fulfilled;
    });

    it('not throw an error if the prepare function errors', () => {
      prepare = () => Promise.reject(new Error('Oh Dear'));
      return expect(
        compose(
          validate,
          prepare,
          sendRequest,
          store,
          data,
          Operation.UNKNOWN,
          LOG_STUB
        )
      ).to.be.fulfilled;
    });

    it('not throw an error if the sendRequest function errors', () => {
      sendRequest = () => Promise.reject(new Error('Oh Dear'));
      return expect(
        compose(
          validate,
          prepare,
          sendRequest,
          store,
          data,
          Operation.UNKNOWN,
          LOG_STUB
        )
      ).to.be.fulfilled;
    });

    it('not throw an error if the store function errors', () => {
      store = () => Promise.reject(new Error('Oh Dear'));
      return expect(
        compose(
          validate,
          prepare,
          sendRequest,
          store,
          data,
          Operation.UNKNOWN,
          LOG_STUB
        )
      ).to.be.fulfilled;
    });
  });
});
