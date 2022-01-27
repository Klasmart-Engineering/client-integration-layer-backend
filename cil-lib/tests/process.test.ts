import chai, { expect } from 'chai';
import cp from 'chai-as-promised';

import { Response } from '../src/lib/protos';
import { compose, Result } from '../src/lib/core/process';

import { LOG_STUB } from './validation/util';

chai.use(cp);

describe('Core processing app flow', () => {
  describe('compose function should', () => {
    let validate: <T>(data: T[]) => Promise<Result<T>>;
    let sendRequest: <T, U>(data: T[]) => Promise<Result<U>>;
    let store: <T>(data: T[]) => Promise<Response[]>;

    beforeEach(() => {
      validate = <T>(_: T[]) => Promise.resolve({ invalid: [], valid: [] });
      sendRequest = <T>(_: T[]) => Promise.resolve({ invalid: [], valid: [] });
      store = <U>(_: U[]) => Promise.resolve([] as Response[]);
    });

    it('not throw an error if the validate function errors', () => {
      validate = () => Promise.reject(new Error('Oh Dear'));
      return expect(compose([], validate, sendRequest, store, LOG_STUB)).to.be
        .fulfilled;
    });

    it('not throw an error if the sendRequest function errors', () => {
      sendRequest = () => Promise.reject(new Error('Oh Dear'));
      return expect(compose([], validate, sendRequest, store, LOG_STUB)).to.be
        .fulfilled;
    });

    it('not throw an error if the store function errors', () => {
      store = () => Promise.reject(new Error('Oh Dear'));
      return expect(compose([], validate, sendRequest, store, LOG_STUB)).to.be
        .fulfilled;
    });
  });
});
