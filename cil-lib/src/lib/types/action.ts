import { UNREACHABLE } from '../errors';
import { Action } from '../protos/api_pb';

export function actionToString(a: Action): string {
  switch (a) {
    case Action.CREATE:
      return 'CREATE';
    default:
      throw UNREACHABLE;
  }
}
