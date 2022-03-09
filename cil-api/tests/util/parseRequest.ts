import { proto, Uuid } from 'cil-lib';

export const parseRequests = (
  reqs: proto.BatchOnboarding
): Map<proto.Entity, Set<Uuid>> => {
  const validIds: Map<proto.Entity, Set<Uuid>> = new Map([
    [proto.Entity.ORGANIZATION, new Set()],
    [proto.Entity.SCHOOL, new Set()],
    [proto.Entity.CLASS, new Set()],
    [proto.Entity.USER, new Set()],
  ]);
  for (const req of reqs.toObject().requestsList) {
    if (req.organization)
      validIds
        .get(proto.Entity.ORGANIZATION)!
        .add(req.organization.externalUuid);
    if (req.school)
      validIds.get(proto.Entity.SCHOOL)!.add(req.school.externalUuid);
    if (req.pb_class)
      validIds.get(proto.Entity.CLASS)!.add(req.pb_class.externalUuid);
    if (req.user) validIds.get(proto.Entity.USER)!.add(req.user.externalUuid);
  }
  return validIds;
};

export const parseResponsesForSuccesses = (
  resp: proto.Responses
): { orgs: number; schools: number; classes: number; users: number } => {
  const successes: Map<proto.Entity, Set<Uuid>> = new Map([
    [proto.Entity.ORGANIZATION, new Set()],
    [proto.Entity.SCHOOL, new Set()],
    [proto.Entity.CLASS, new Set()],
    [proto.Entity.USER, new Set()],
  ]);
  const errors: Map<proto.Entity, Set<Uuid>> = new Map([
    [proto.Entity.ORGANIZATION, new Set()],
    [proto.Entity.SCHOOL, new Set()],
    [proto.Entity.CLASS, new Set()],
    [proto.Entity.USER, new Set()],
  ]);
  for (const res of resp.toObject().responsesList) {
    const key = res.entity;
    const id = res.entityId;
    if (!res.success) {
      errors.get(key).add(id);
      continue;
    }
    successes.get(key).add(id);
  }
  for (const [k, v] of errors.entries()) {
    const s = successes.get(k);
    for (const id of v) s.delete(id);
  }

  return {
    orgs: successes.get(proto.Entity.ORGANIZATION).size,
    schools: successes.get(proto.Entity.SCHOOL).size,
    classes: successes.get(proto.Entity.CLASS).size,
    users: successes.get(proto.Entity.USER).size,
  };
};

export const parseResponsesForErrorIds = (
  resp: proto.Responses
): Map<proto.Entity, Set<Uuid>> => {
  const errors: Map<proto.Entity, Set<Uuid>> = new Map([
    [proto.Entity.ORGANIZATION, new Set()],
    [proto.Entity.SCHOOL, new Set()],
    [proto.Entity.CLASS, new Set()],
    [proto.Entity.USER, new Set()],
  ]);
  for (const res of resp.toObject().responsesList) {
    if (res.success) continue;
    const key = res.entity;
    const id = res.entityId;
    errors.get(key).add(id);
  }
  return errors;
};

export const parseResponsesForErrorMessages = (
  resp: proto.Responses
): Map<proto.Entity, Map<Uuid, string[]>> => {
  const errors: Map<proto.Entity, Map<Uuid, string[]>> = new Map([
    [proto.Entity.ORGANIZATION, new Map()],
    [proto.Entity.SCHOOL, new Map()],
    [proto.Entity.CLASS, new Map()],
    [proto.Entity.USER, new Map()],
  ]);
  for (const res of resp.toObject().responsesList) {
    if (res.success) continue;
    const key = res.entity;
    const id = res.entityId;
    let errorDetails = errors.get(key).get(id) || [];
    if (res.errors) {
      const e = res.errors;
      errorDetails = [
        ...errorDetails,
        ...(e.invalidRequest?.errorsList
          ?.map((err) => err.detailsList)
          .flat() || []),
        ...(e.validation?.errorsList?.map((err) => err.detailsList).flat() ||
          []),
        ...(e.internalServer?.detailsList || []),
        ...(e.entityDoesNotExist?.detailsList || []),
        ...(e.entityAlreadyExists?.detailsList || []),
      ];
    }
    if (errorDetails.length > 0) errors.get(key).set(id, errorDetails);
  }
  return errors;
};
