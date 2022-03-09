import { expect } from 'chai';
import { v4 as uuidv4 } from 'uuid';
import { addChunkToRequests } from '../../../../src/lib/core/addUsersToSchool/adminService';

describe('add users to school `addChunkToRequests` should', () => {
  it('add a single request with 1 school and < 50 students', () => {
    const schoolId = uuidv4();
    const data = [{ kidsloop: uuidv4(), external: uuidv4() }];
    const requestBucket = [new Map()];
    const indexChecker = new Map();
    addChunkToRequests(schoolId, data, requestBucket, indexChecker);
    expect(requestBucket).to.have.lengthOf(1);
    const result = requestBucket.values().next().value;
    expect(result.size).to.equal(1);
    for (const [k, v] of result.entries()) {
      expect(k).to.equal(schoolId);
      expect(v).to.eql({
        schoolId,
        userIds: [data[0].kidsloop],
      });
    }
  });

  it('add a single request with 1 school and 50 students', () => {
    const schoolId = uuidv4();
    const data = [];
    for (let i = 0; i < 50; i += 1)
      data.push({ kidsloop: uuidv4(), external: uuidv4() });
    const requestBucket = [new Map()];
    const indexChecker = new Map();
    addChunkToRequests(schoolId, data, requestBucket, indexChecker);
    expect(requestBucket).to.have.lengthOf(1);
    const result = requestBucket.values().next().value;
    expect(result.size).to.equal(1);
    for (const [k, v] of result.entries()) {
      expect(k).to.equal(schoolId);
      expect(v).to.eql({
        schoolId,
        userIds: data.map((d) => d.kidsloop),
      });
    }
  });

  it('add a single request with 1 school and 70 students', () => {
    const schoolId = uuidv4();
    const data = [];
    for (let i = 0; i < 70; i += 1)
      data.push({ kidsloop: uuidv4(), external: uuidv4() });
    const requestBucket = [new Map()];
    const indexChecker = new Map();
    addChunkToRequests(schoolId, data, requestBucket, indexChecker);
    expect(requestBucket).to.have.lengthOf(2);
    const results = requestBucket.values();
    let next = results.next();
    let start = 0;
    while (next) {
      const req = next.value;
      expect(req.size).to.equal(1);
      for (const [k, v] of req.entries()) {
        expect(k).to.equal(schoolId);
        expect(v).to.eql({
          schoolId,
          userIds: data
            .map((d: Partial<{ kidsloop: string }>) => d.kidsloop)
            .slice(start, start + 50),
        });
        start += 50;
      }
      next = results.next();
      if (next.done) break;
    }
  });

  it('add 2 requests with a single school and 100 students', () => {
    const schoolId = uuidv4();
    const data = [];
    for (let i = 0; i < 100; i += 1)
      data.push({ kidsloop: uuidv4(), external: uuidv4() });
    const requestBucket = [new Map()];
    const indexChecker = new Map();
    addChunkToRequests(schoolId, data, requestBucket, indexChecker);
    expect(requestBucket).to.have.lengthOf(2);
    const results = requestBucket.values();
    let next = results.next();
    let start = 0;
    while (next) {
      const req = next.value;
      expect(req.size).to.equal(1);
      for (const [k, v] of req.entries()) {
        expect(k).to.equal(schoolId);
        expect(v).to.eql({
          schoolId,
          userIds: data
            .map((d: Partial<{ kidsloop: string }>) => d.kidsloop)
            .slice(start, start + 50),
        });
        start += 50;
      }
      next = results.next();
      if (next.done) break;
    }
  });

  it('add a single request with 2 schools containing <= 50 students', () => {
    const schoolId1 = uuidv4();
    const schoolId2 = uuidv4();
    const data = [];
    for (let i = 0; i < 50; i += 1)
      data.push({ kidsloop: uuidv4(), external: uuidv4() });
    const requestBucket = [new Map()];
    const indexChecker = new Map();
    addChunkToRequests(schoolId1, data, requestBucket, indexChecker);
    addChunkToRequests(schoolId2, data, requestBucket, indexChecker);
    expect(requestBucket).to.have.lengthOf(1);
    const results = requestBucket.values();
    let next = results.next();
    const schoolIds = [schoolId1, schoolId2];
    while (next) {
      const req = next.value;
      expect(req.size).to.equal(2);
      for (const v of req.values()) {
        expect(schoolIds).to.include(v.schoolId);
        expect(v.userIds).to.eql(data.map((d) => d.kidsloop));
      }
      next = results.next();
      if (next.done) break;
    }
  });

  it('should batch 2 schools with 150 and 100 students into 3 requests', () => {
    const schoolId1 = uuidv4();
    const schoolId2 = uuidv4();
    const data = [];
    for (let i = 0; i < 100; i += 1)
      data.push({ kidsloop: uuidv4(), external: uuidv4() });
    const additionalData = [];
    for (let i = 0; i < 50; i += 1)
      additionalData.push({ kidsloop: uuidv4(), external: uuidv4() });
    const requestBucket = [new Map()];
    const indexChecker = new Map();
    addChunkToRequests(
      schoolId1,
      data.concat(additionalData),
      requestBucket,
      indexChecker
    );
    addChunkToRequests(schoolId2, data, requestBucket, indexChecker);
    expect(requestBucket).to.have.lengthOf(3);
    const results = requestBucket.values();
    let next = results.next();
    const schoolIds = [schoolId1, schoolId2];
    let iteration = 1;
    while (next) {
      const req = next.value;
      expect(req.size).to.equal(iteration === 3 ? 1 : 2);
      for (const v of req.values()) {
        expect(schoolIds).to.include(v.schoolId);
        const tempData = data.concat(additionalData);
        const start = (iteration - 1) * 50;
        const expectedData = tempData.slice(start, start + 50);
        expect(v.userIds).to.eql(expectedData.map((d) => d.kidsloop));
      }
      iteration += 1;
      next = results.next();
      if (next.done) break;
    }
  });

  it('handle adding the school in multiple iterations', () => {
    const schoolId1 = uuidv4();
    const data = [];
    for (let j = 0; j < 4; j += 1) {
      const innerData = [];
      for (let i = 0; i < 50; i += 1)
        innerData.push({ kidsloop: uuidv4(), external: uuidv4() });

      data.push({
        schoolId: j <= 1 ? schoolId1 : uuidv4(),
        userIds: innerData,
      });
    }
    const requestBucket = [new Map()];
    const indexChecker = new Map();
    for (const { schoolId, userIds } of data) {
      addChunkToRequests(schoolId, userIds, requestBucket, indexChecker);
    }
    expect(requestBucket).to.have.lengthOf(2);
    const results = requestBucket.values();
    let next = results.next();
    const schoolIds = data.map((d) => d.schoolId);
    let iteration = 1;
    while (next) {
      const req = next.value;
      expect(req.size).to.equal(iteration === 1 ? 3 : 1);
      for (const v of req.values()) {
        expect(schoolIds).to.include(v.schoolId);
        const expectedData = new Set(
          data
            .filter((d) => d.schoolId === v.schoolId)
            .flatMap((d) => d.userIds.map((i) => i.kidsloop))
        );
        for (const id of v.userIds) {
          expect(expectedData.has(id)).to.be.true;
        }
      }
      iteration += 1;
      next = results.next();
      if (next.done) break;
    }
  });

  it('put a maximum of 50 requests in a single map', () => {
    const data = [];
    for (let j = 0; j < 51; j += 1) {
      const innerData = [];
      for (let i = 0; i < 2; i += 1)
        innerData.push({ kidsloop: uuidv4(), external: uuidv4() });

      data.push({
        schoolId: uuidv4(),
        userIds: innerData,
      });
    }
    const requestBucket = [new Map()];
    const indexChecker = new Map();
    for (const { schoolId, userIds } of data) {
      addChunkToRequests(schoolId, userIds, requestBucket, indexChecker);
    }
    expect(requestBucket).to.have.lengthOf(2);
    const results = requestBucket.values();
    let next = results.next();
    const schoolIds = data.map((d) => d.schoolId);
    let iteration = 1;
    while (next) {
      const req = next.value;
      expect(req.size).to.equal(iteration === 1 ? 50 : 1);
      for (const v of req.values()) {
        expect(schoolIds).to.include(v.schoolId);
        const expectedData = new Set(
          data
            .filter((d) => d.schoolId === v.schoolId)
            .flatMap((d) => d.userIds.map((i) => i.kidsloop))
        );
        for (const id of v.userIds) {
          expect(expectedData.has(id)).to.be.true;
        }
      }
      iteration += 1;
      next = results.next();
      if (next.done) break;
    }
  });
});
