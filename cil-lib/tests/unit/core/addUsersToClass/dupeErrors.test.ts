import { expect } from 'chai';
import { v4 as uuidv4 } from 'uuid';
import { teacherDupeErrors } from '../../../../src/lib/core/addUsersToClass/adminService';
import { AdminDupeError } from '../../../../src/lib/services/adminService';
import { AddTeachersToClassInput } from '../../../../src/lib/services/adminService/users';

describe('add users to class `teacherDupeErrors` should', () => {
  it('return invalid ids when duplicates in data', () => {
    const dupes = new Map<string, Set<string>>();
    const classId = uuidv4();
    const teacherIds = [uuidv4(), uuidv4()];
    dupes.set(classId, new Set(teacherIds));
    const dupeError = new AdminDupeError(dupes);
    const req: AddTeachersToClassInput = {
      classId: classId,
      teacherIds: teacherIds,
    };
    const result = teacherDupeErrors(dupeError, [req]);

    expect(result.invalidIds).to.eql(new Set(teacherIds));
  });
  it('return invalid ids and pass valid ids when data partially duped', () => {
    const dupes = new Map<string, Set<string>>();
    const classId = uuidv4();
    const teacher1 = uuidv4();
    const teacher2 = uuidv4();
    const teacherIds = [teacher1, teacher2];
    dupes.set(classId, new Set([teacher1]));
    const dupeError = new AdminDupeError(dupes);
    const req: AddTeachersToClassInput = {
      classId: classId,
      teacherIds: teacherIds,
    };
    const result = teacherDupeErrors(dupeError, [req]);

    expect(result.invalidIds).to.eql(new Set([teacher1]));
    expect(result.valid).to.have.length(1);
    expect(result.valid[0].teacherIds).to.eql([teacher2]);
    expect(result.valid[0].classId).to.equal(classId);
  });
});
