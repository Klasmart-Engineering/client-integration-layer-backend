import { expect } from 'chai';
import { v4 as uuidv4 } from 'uuid';
import { addChunkToRequests } from '../../../../src/lib/core/addUsersToClass/adminService';

describe('add users to classes `addChunkToRequests` should', () => {
  it('add a single request with 1 class and < 50 students', () => {
    const classId = uuidv4();
    const data = [{ kidsloop: uuidv4(), external: uuidv4() }];
    const requestBucket = [new Map()];
    const indexChecker = new Map();
    addChunkToRequests(
      classId,
      data,
      requestBucket,
      indexChecker,
      'studentIds'
    );
    expect(requestBucket).to.have.lengthOf(1);
    const result = requestBucket.values().next().value;
    expect(result.size).to.equal(1);
    for (const [k, v] of result.entries()) {
      expect(k).to.equal(classId);
      expect(v).to.eql({
        classId,
        studentIds: [data[0].kidsloop],
      });
    }
  });

  it('add a single request with 1 class and 50 students', () => {
    const classId = uuidv4();
    const data = [];
    for (let i = 0; i < 50; i += 1)
      data.push({ kidsloop: uuidv4(), external: uuidv4() });
    const requestBucket = [new Map()];
    const indexChecker = new Map();
    addChunkToRequests(
      classId,
      data,
      requestBucket,
      indexChecker,
      'studentIds'
    );
    expect(requestBucket).to.have.lengthOf(1);
    const result = requestBucket.values().next().value;
    expect(result.size).to.equal(1);
    for (const [k, v] of result.entries()) {
      expect(k).to.equal(classId);
      expect(v).to.eql({
        classId,
        studentIds: data.map((d) => d.kidsloop),
      });
    }
  });

  it('add a single request with 1 class and 70 students', () => {
    const classId = uuidv4();
    const data = [];
    for (let i = 0; i < 70; i += 1)
      data.push({ kidsloop: uuidv4(), external: uuidv4() });
    const requestBucket = [new Map()];
    const indexChecker = new Map();
    addChunkToRequests(
      classId,
      data,
      requestBucket,
      indexChecker,
      'studentIds'
    );
    expect(requestBucket).to.have.lengthOf(2);
    const results = requestBucket.values();
    let next = results.next();
    let start = 0;
    while (next) {
      const req = next.value;
      expect(req.size).to.equal(1);
      for (const [k, v] of req.entries()) {
        expect(k).to.equal(classId);
        expect(v).to.eql({
          classId,
          studentIds: data
            .map((d: Partial<{ kidsloop: string }>) => d.kidsloop)
            .slice(start, start + 50),
        });
        start += 50;
      }
      next = results.next();
      if (next.done) break;
    }
  });

  it('add 2 requests with a single class and 100 students', () => {
    const classId = uuidv4();
    const data = [];
    for (let i = 0; i < 100; i += 1)
      data.push({ kidsloop: uuidv4(), external: uuidv4() });
    const requestBucket = [new Map()];
    const indexChecker = new Map();
    addChunkToRequests(
      classId,
      data,
      requestBucket,
      indexChecker,
      'studentIds'
    );
    expect(requestBucket).to.have.lengthOf(2);
    const results = requestBucket.values();
    let next = results.next();
    let start = 0;
    while (next) {
      const req = next.value;
      expect(req.size).to.equal(1);
      for (const [k, v] of req.entries()) {
        expect(k).to.equal(classId);
        expect(v).to.eql({
          classId,
          studentIds: data
            .map((d: Partial<{ kidsloop: string }>) => d.kidsloop)
            .slice(start, start + 50),
        });
        start += 50;
      }
      next = results.next();
      if (next.done) break;
    }
  });

  it('add a single request with 2 classes containing <= 50 students', () => {
    const classId1 = uuidv4();
    const classId2 = uuidv4();
    const data = [];
    for (let i = 0; i < 50; i += 1)
      data.push({ kidsloop: uuidv4(), external: uuidv4() });
    const requestBucket = [new Map()];
    const indexChecker = new Map();
    addChunkToRequests(
      classId1,
      data,
      requestBucket,
      indexChecker,
      'studentIds'
    );
    addChunkToRequests(
      classId2,
      data,
      requestBucket,
      indexChecker,
      'studentIds'
    );
    expect(requestBucket).to.have.lengthOf(1);
    const results = requestBucket.values();
    let next = results.next();
    const classIds = [classId1, classId2];
    while (next) {
      const req = next.value;
      expect(req.size).to.equal(2);
      for (const v of req.values()) {
        expect(classIds).to.include(v.classId);
        expect(v.studentIds).to.eql(data.map((d) => d.kidsloop));
      }
      next = results.next();
      if (next.done) break;
    }
  });

  it('should batch 2 classes with 150 and 100 students into 3 requests', () => {
    const classId1 = uuidv4();
    const classId2 = uuidv4();
    const data = [];
    for (let i = 0; i < 100; i += 1)
      data.push({ kidsloop: uuidv4(), external: uuidv4() });
    const additionalData = [];
    for (let i = 0; i < 50; i += 1)
      additionalData.push({ kidsloop: uuidv4(), external: uuidv4() });
    const requestBucket = [new Map()];
    const indexChecker = new Map();
    addChunkToRequests(
      classId1,
      data.concat(additionalData),
      requestBucket,
      indexChecker,
      'studentIds'
    );
    addChunkToRequests(
      classId2,
      data,
      requestBucket,
      indexChecker,
      'studentIds'
    );
    expect(requestBucket).to.have.lengthOf(3);
    const results = requestBucket.values();
    let next = results.next();
    const classIds = [classId1, classId2];
    let iteration = 1;
    while (next) {
      const req = next.value;
      expect(req.size).to.equal(iteration === 3 ? 1 : 2);
      for (const v of req.values()) {
        expect(classIds).to.include(v.classId);
        const tempData = data.concat(additionalData);
        const start = (iteration - 1) * 50;
        const expectedData = tempData.slice(start, start + 50);
        expect(v.studentIds).to.eql(expectedData.map((d) => d.kidsloop));
      }
      iteration += 1;
      next = results.next();
      if (next.done) break;
    }
  });

  it('handle adding the class in multiple iterations', () => {
    const classId1 = uuidv4();
    const data = [];
    for (let j = 0; j < 4; j += 1) {
      const innerData = [];
      for (let i = 0; i < 50; i += 1)
        innerData.push({ kidsloop: uuidv4(), external: uuidv4() });

      data.push({
        classId: j <= 1 ? classId1 : uuidv4(),
        studentIds: innerData,
      });
    }
    const requestBucket = [new Map()];
    const indexChecker = new Map();
    for (const { classId, studentIds } of data) {
      addChunkToRequests(
        classId,
        studentIds,
        requestBucket,
        indexChecker,
        'studentIds'
      );
    }
    expect(requestBucket).to.have.lengthOf(2);
    const results = requestBucket.values();
    let next = results.next();
    const classIds = data.map((d) => d.classId);
    let iteration = 1;
    while (next) {
      const req = next.value;
      expect(req.size).to.equal(iteration === 1 ? 3 : 1);
      for (const v of req.values()) {
        expect(classIds).to.include(v.classId);
        const expectedData = new Set(
          data
            .filter((d) => d.classId === v.classId)
            .flatMap((d) => d.studentIds.map((i) => i.kidsloop))
        );
        for (const id of v.studentIds) {
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
        classId: uuidv4(),
        studentIds: innerData,
      });
    }
    const requestBucket = [new Map()];
    const indexChecker = new Map();
    for (const { classId, studentIds } of data) {
      addChunkToRequests(
        classId,
        studentIds,
        requestBucket,
        indexChecker,
        'studentIds'
      );
    }
    expect(requestBucket).to.have.lengthOf(2);
    const results = requestBucket.values();
    let next = results.next();
    const classIds = data.map((d) => d.classId);
    let iteration = 1;
    while (next) {
      const req = next.value;
      expect(req.size).to.equal(iteration === 1 ? 50 : 1);
      for (const v of req.values()) {
        expect(classIds).to.include(v.classId);
        const expectedData = new Set(
          data
            .filter((d) => d.classId === v.classId)
            .flatMap((d) => d.studentIds.map((i) => i.kidsloop))
        );
        for (const id of v.studentIds) {
          expect(expectedData.has(id)).to.be.true;
        }
      }
      iteration += 1;
      next = results.next();
      if (next.done) break;
    }
  });
});
