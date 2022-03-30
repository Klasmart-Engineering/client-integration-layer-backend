import { Gender, proto } from 'cil-lib';
import { v4 as uuidv4 } from 'uuid';
import { IdName } from './populateAdminService';

const { OnboardingRequest, Link } = proto;

export class TestCaseBuilder {
  private shouldOptimizeLinks = true;

  // K: ID, V: Name
  private validOrgMappings: Map<string, string> = new Map();
  private validSchoolIds: Map<string, Set<string>> = new Map();
  private validClassIds: Set<string> = new Set();
  private validUserIds: Set<string> = new Set();
  private validProgramIds: Map<string, string[]> = new Map();
  private validRoleIds: Map<string, string[]> = new Map();

  private programsForSchool = new Map<string, string[]>();
  private classesForSchool = new Map<string, Set<string>>();

  private programsForClass = new Map<string, string[]>();

  private usersInOrg = new Map<string, Set<string>>();
  private usersInSchool = new Map<string, Set<string>>();
  private studentsInClasses = new Map<string, Set<string>>();
  private teachersInClasses = new Map<string, Set<string>>();

  private invalidOrgIds: Set<string> = new Set();
  private invalidSchoolIds: Map<string, Set<string>> = new Map();
  private invalidClassIds: Set<string> = new Set();
  private invalidUserIds: Set<string> = new Set();

  private requests: proto.OnboardingRequest[] = [];

  constructor() {}

  public getValidSchools(org: string): string[] {
    return Array.from(this.validSchoolIds.get(org) || []);
  }

  public getValidClasses(): string[] {
    return Array.from(this.validClassIds);
  }

  public getValidUsers(): string[] {
    return Array.from(this.validUserIds);
  }

  public getValidUsersInOrg(org: string): string[] {
    return Array.from(this.usersInOrg.get(org) || []);
  }

  public getValidUsersInSchool(school: string): string[] {
    return Array.from(this.usersInSchool.get(school) || []);
  }

  public getValidStudentsInClass(c: string): string[] {
    return Array.from(this.studentsInClasses.get(c) || []);
  }

  public getProgramsForSchool(school: string): string[] {
    return Array.from(this.programsForSchool.get(school) || []);
  }

  public getClassesForSchool(school: string): string[] {
    return Array.from(this.classesForSchool.get(school) || []);
  }

  get validOrgIds(): string[] {
    return Array.from(this.validOrgMappings.keys());
  }

  get allOrgIds(): string[] {
    return Array.from(
      new Set(this.validOrgIds.concat(Array.from(this.invalidOrgIds)))
    );
  }

  get invalidSchools(): string[] {
    return Array.from(this.invalidSchools);
  }

  get allSchoolIds(): { org: string; schools: string[] }[] {
    const m = new Map();
    for (const [o, s] of this.validSchoolIds) {
      const se = m.get(o) || new Set();
      for (const sch of s) se.add(sch);
      m.set(o, se);
    }
    for (const [o, s] of this.invalidSchoolIds) {
      const se = m.get(o) || new Set();
      for (const sch of s) se.add(sch);
      m.set(o, se);
    }
    return Array.from(m).map(([o, s]) => ({ org: o, schools: Array.from(s) }));
  }

  get invalidClasses(): string[] {
    return Array.from(this.invalidClassIds);
  }

  get invalidUsers(): string[] {
    return Array.from(this.invalidUserIds);
  }

  public addValidOrgs(
    orgs: Map<IdName, { roles: IdName[]; programs: IdName[] }>
  ): TestCaseBuilder {
    for (const [org, data] of orgs) {
      this.validOrgMappings.set(org.id, org.name);
      this.validProgramIds.set(
        org.id,
        data.programs.map(({ name }) => name)
      );
      this.validRoleIds.set(
        org.id,
        data.roles.map(({ name }) => name)
      );
      const r = new proto.OnboardingRequest().setOrganization(
        new proto.Organization().setExternalUuid(org.id).setName(org.name)
      );
      this.requests.push(r);
      this.validSchoolIds.set(org.id, new Set());
    }

    return this;
  }

  public removeOrg(org: string): TestCaseBuilder {
    this.validOrgMappings.delete(org);
    this.validProgramIds.delete(org);
    this.validRoleIds.delete(org);
    return this;
  }

  public setShouldOptimizeLinks(b: boolean): TestCaseBuilder {
    this.shouldOptimizeLinks = b;
    return this;
  }

  public addValidSchools(n: number): TestCaseBuilder {
    for (let i = 0; i < n; i += 1) {
      this.addSchool();
    }
    return this;
  }

  public addValidSchoolsToEachOrg(numberOfSchools = 5): TestCaseBuilder {
    for (const orgId of this.allOrgIds) {
      for (let i = 0; i < numberOfSchools; i += 1) {
        const createEntityRequest = new proto.School();
        // Generate the school request
        const data = {
          ...generateValidSchool(orgId),
        };
        createEntityRequest
          .setExternalOrganizationUuid(data.externalOrganizationUuid)
          .setExternalUuid(data.externalUuid)
          .setName(data.name)
          .setShortCode(data.shortCode);
        this.requests.push(
          new OnboardingRequest().setSchool(createEntityRequest)
        );

        // Add programs to the school
        const programs = [
          ...this.validProgramIds.get(data.externalOrganizationUuid),
        ];

        const linkPrograms = new proto.AddProgramsToSchool()
          .setExternalSchoolUuid(data.externalUuid)
          .setProgramNamesList(programs);
        this.requests.push(
          new OnboardingRequest().setLinkEntities(
            new Link().setAddProgramsToSchool(linkPrograms)
          )
        );

        this.programsForSchool.set(data.externalUuid, programs);

        const validSchoolMap = this.validSchoolIds.get(orgId);
        if (validSchoolMap) {
          validSchoolMap.add(data.externalUuid);
          this.validSchoolIds.set(orgId, validSchoolMap);
        }
      }
    }
    return this;
  }

  public addSchool(
    entity: Partial<proto.School.AsObject> & { programs?: string[] } = {},
    isValid: boolean = true
  ): TestCaseBuilder {
    const createEntityRequest = new proto.School();
    const orgId =
      entity && entity.externalOrganizationUuid
        ? entity.externalOrganizationUuid
        : this.getRandomElement(this.validOrgIds);
    if (!this.validOrgMappings.has(orgId)) this.invalidOrgIds.add(orgId);

    // Generate the school request
    const data = {
      ...generateValidSchool(orgId),
      ...entity,
    };
    createEntityRequest
      .setExternalOrganizationUuid(data.externalOrganizationUuid)
      .setExternalUuid(data.externalUuid)
      .setName(data.name)
      .setShortCode(data.shortCode);
    this.requests.push(new OnboardingRequest().setSchool(createEntityRequest));

    // Add programs to the school
    const programs =
      entity && entity.programs
        ? entity.programs
        : [...(this.validProgramIds.get(data.externalOrganizationUuid) || [])];

    const linkPrograms = new proto.AddProgramsToSchool()
      .setExternalSchoolUuid(data.externalUuid)
      .setProgramNamesList(programs);
    this.requests.push(
      new OnboardingRequest().setLinkEntities(
        new Link().setAddProgramsToSchool(linkPrograms)
      )
    );

    this.programsForSchool.set(data.externalUuid, programs);

    const validSchoolMap = this.validSchoolIds.get(orgId);
    if (validSchoolMap) {
      validSchoolMap.add(data.externalUuid);
      this.validSchoolIds.set(orgId, validSchoolMap);
    }
    if (!isValid) {
      const invalidSchools = this.invalidSchoolIds.get(orgId) || new Set();
      invalidSchools.add(data.externalUuid);
      this.invalidSchoolIds.set(orgId, invalidSchools);
    }
    return this;
  }

  public addValidClasses(n: number): TestCaseBuilder {
    for (let i = 0; i < n; i += 1) {
      this.addClass();
    }
    return this;
  }

  public addValidClassesToEachSchool(
    classesPerSchool: number = 5
  ): TestCaseBuilder {
    for (const { org, schools } of this.allSchoolIds) {
      for (const school of schools) {
        for (let i = 0; i < classesPerSchool; i += 1) {
          const createEntityRequest = new proto.Class();

          // Generate the request
          const data = {
            ...generateValidClass(org, school),
          };
          const classId = data.externalUuid;
          createEntityRequest
            .setExternalOrganizationUuid(data.externalOrganizationUuid)
            .setExternalSchoolUuid(data.externalSchoolUuid)
            .setExternalUuid(data.externalUuid)
            .setName(data.name);
          this.requests.push(
            new OnboardingRequest().setClass(createEntityRequest)
          );

          if (!this.shouldOptimizeLinks) {
            // Add the class to a school
            const linkEntity = new proto.AddClassesToSchool()
              .setExternalSchoolUuid(school)
              .setExternalClassUuidsList([classId]);

            this.requests.push(
              new OnboardingRequest().setLinkEntities(
                new Link().setAddClassesToSchool(linkEntity)
              )
            );
          }

          if (!this.classesForSchool.has(school))
            this.classesForSchool.set(school, new Set());
          this.classesForSchool.get(school).add(classId);

          // Add programs to the class
          const programs = [...(this.programsForSchool.get(school) || [])];

          const linkPrograms = new proto.AddProgramsToClass()
            .setExternalClassUuid(data.externalUuid)
            .setProgramNamesList(programs);
          this.requests.push(
            new OnboardingRequest().setLinkEntities(
              new Link().setAddProgramsToClass(linkPrograms)
            )
          );

          this.programsForClass.set(classId, programs);
          this.validClassIds.add(classId);
        }
      }
    }
    return this;
  }

  public addClass(
    entity: Partial<proto.Class.AsObject> & { programs?: string[] } = {},
    isValid: boolean = true,
    isLinkedWithPrograms: boolean = true
  ): TestCaseBuilder {
    const createEntityRequest = new proto.Class();
    const orgId =
      entity && entity.externalOrganizationUuid
        ? entity.externalOrganizationUuid
        : this.getRandomElement(this.validOrgIds);
    if (!this.validOrgMappings.has(orgId)) this.invalidOrgIds.add(orgId);
    const schoolId =
      entity && entity.externalSchoolUuid
        ? entity.externalSchoolUuid
        : this.getRandomElement(this.validSchoolIds.get(orgId) || []);

    // Generate the request
    const data = {
      ...generateValidClass(orgId, schoolId),
      ...entity,
    };
    const classId = data.externalUuid;
    createEntityRequest
      .setExternalOrganizationUuid(data.externalOrganizationUuid)
      .setExternalSchoolUuid(data.externalSchoolUuid)
      .setExternalUuid(data.externalUuid)
      .setName(data.name);
    this.requests.push(new OnboardingRequest().setClass(createEntityRequest));

    if (!this.shouldOptimizeLinks) {
      // Add the class to a school
      const linkEntity = new proto.AddClassesToSchool()
        .setExternalSchoolUuid(schoolId)
        .setExternalClassUuidsList([classId]);

      this.requests.push(
        new OnboardingRequest().setLinkEntities(
          new Link().setAddClassesToSchool(linkEntity)
        )
      );
    }

    if (!this.classesForSchool.has(schoolId))
      this.classesForSchool.set(schoolId, new Set());
    this.classesForSchool.get(schoolId).add(data.externalUuid);

    // Add programs to the class
    if (isLinkedWithPrograms) {
      if (this.programsForSchool.get(schoolId)) {
        const programs =
          entity && entity.programs
            ? entity.programs
            : [...this.programsForSchool.get(schoolId)];

        const linkPrograms = new proto.AddProgramsToClass()
          .setExternalClassUuid(data.externalUuid)
          .setProgramNamesList(programs);
        this.requests.push(
          new OnboardingRequest().setLinkEntities(
            new Link().setAddProgramsToClass(linkPrograms)
          )
        );

        this.programsForClass.set(data.externalUuid, programs);
      }
    }

    isValid
      ? this.validClassIds.add(data.externalUuid)
      : this.invalidClassIds.add(data.externalUuid);
    return this;
  }

  public addValidUsers(
    n: number,
    addToValidOrgs?: number,
    addToValidSchools?: number,
    addToValidClasses?: number,
    isTeacher = false
  ): TestCaseBuilder {
    for (let i = 0; i < n; i += 1) {
      const opts = { isTeacher };
      if (typeof addToValidOrgs === 'number')
        opts['addToValidOrgs'] = addToValidOrgs;
      if (typeof addToValidSchools === 'number')
        opts['addToValidSchools'] = addToValidSchools;
      if (typeof addToValidClasses === 'number')
        opts['addToValidClasses'] = addToValidClasses;
      this.addUser(opts);
    }
    return this;
  }

  public addValidUsersToEachSchool(
    numberOfStudentsPerSchool = 100,
    numberOfTeachersPerSchool = 10,
    addEachUserToNClasses = 5
  ): TestCaseBuilder {
    for (const { org, schools } of this.allSchoolIds) {
      for (const school of schools) {
        let teachersToAdd = numberOfTeachersPerSchool;
        let studentsToAdd = numberOfStudentsPerSchool;
        while (teachersToAdd + studentsToAdd > 0) {
          const createEntityRequest = new proto.User();
          const baseUser = generateUser();

          // Generate the request
          const data = {
            ...baseUser,
            externalOrganizationUuid: org,
            roleIdentifiersList: Array.from(this.validRoleIds.get(org)),
          };
          createEntityRequest
            .setExternalOrganizationUuid(data.externalOrganizationUuid)
            .setExternalUuid(data.externalUuid)
            .setGivenName(data.givenName)
            .setFamilyName(data.familyName)
            .setPhone(data.phone)
            .setEmail(data.email)
            .setDateOfBirth(data.dateOfBirth)
            .setUsername(data.username)
            .setGender(data.gender)
            .setRoleIdentifiersList(data.roleIdentifiersList);
          this.requests.push(
            new OnboardingRequest().setUser(createEntityRequest)
          );

          if (!this.shouldOptimizeLinks) {
            // Add the user to an organization
            const linkEntity = new proto.AddUsersToOrganization()
              .setExternalOrganizationUuid(org)
              .setRoleIdentifiersList(Array.from(this.validRoleIds.get(org)))
              .setExternalUserUuidsList([data.externalUuid]);

            this.requests.push(
              new OnboardingRequest().setLinkEntities(
                new Link().setAddUsersToOrganization(linkEntity)
              )
            );
          }

          if (!this.usersInOrg.has(org)) this.usersInOrg.set(org, new Set());
          this.usersInOrg.get(org).add(data.externalUuid);

          if (!this.shouldOptimizeLinks) {
            // Add the user to an organization
            const linkEntity = new proto.AddUsersToSchool()
              .setExternalSchoolUuid(school)
              .setExternalUserUuidsList([data.externalUuid]);

            this.requests.push(
              new OnboardingRequest().setLinkEntities(
                new Link().setAddUsersToSchool(linkEntity)
              )
            );
          }

          if (!this.usersInSchool.has(school))
            this.usersInSchool.set(school, new Set());
          this.usersInSchool.get(school).add(data.externalUuid);
          const classes = new Set<string>();
          const potentialClasses =
            this.classesForSchool.get(school) || new Set();
          if (potentialClasses.size < addEachUserToNClasses)
            throw new Error(
              `Cannot add a user to ${addEachUserToNClasses} as the school only has ${potentialClasses.size} configured`
            );
          for (const c of this.getRandomElements(
            potentialClasses,
            addEachUserToNClasses
          ))
            classes.add(c);

          for (const cla of classes) {
            const isTeacher = teachersToAdd > 0;
            if (!this.shouldOptimizeLinks) {
              // Add the user to an organization
              const linkEntity =
                new proto.AddUsersToClass().setExternalClassUuid(cla);
              isTeacher
                ? linkEntity.setExternalTeacherUuidList([data.externalUuid])
                : linkEntity.setExternalStudentUuidList([data.externalUuid]);

              this.requests.push(
                new OnboardingRequest().setLinkEntities(
                  new Link().setAddUsersToClass(linkEntity)
                )
              );
            }

            if (!this.studentsInClasses.has(cla)) {
              this.studentsInClasses.set(cla, new Set());
              this.teachersInClasses.set(cla, new Set());
            }
            if (isTeacher) {
              this.teachersInClasses.get(cla).add(data.externalUuid);
            } else {
              this.studentsInClasses.get(cla).add(data.externalUuid);
            }
          }

          teachersToAdd > 0 ? (teachersToAdd -= 1) : (studentsToAdd -= 1);

          this.validUserIds.add(data.externalUuid);
        }
      }
    }
    return this;
  }

  public addUser(
    entity: Partial<proto.User.AsObject> & {
      addToValidOrgs?: number;
      addToValidSchools?: number;
      addToValidClasses?: number;
      orgs?: string[];
      schools?: string[];
      classes?: string[];
      isTeacher?: boolean;
      // K: Org ID
      roles?: Map<string, string[]>;
    } = {},
    isValid: boolean = true
  ): TestCaseBuilder {
    const opts = {
      addToValidOrgs: 1,
      addToValidSchools: 1,
      addToValidClasses: 2,
      isTeacher: false,
      orgs: [],
      schools: [],
      classes: [],
      roles: new Map(),
      ...entity,
    };
    const { addToValidOrgs, addToValidSchools, addToValidClasses } = opts;

    const createEntityRequest = new proto.User();
    const baseUser = generateUser();
    const orgs = new Set<string>();
    if (addToValidOrgs) {
      if (addToValidOrgs > this.validOrgIds.length)
        throw new Error(
          'Cannot add a user to more valid organizations than are currently configured'
        );
      while (orgs.size < addToValidOrgs) {
        for (const o of this.getRandomElements(
          this.validOrgIds,
          addToValidOrgs
        )) {
          orgs.add(o);
        }
      }
    }
    if (opts.externalOrganizationUuid) orgs.add(opts.externalOrganizationUuid);
    for (const o of opts.orgs) orgs.add(o);

    const schools = new Set<string>();
    if (addToValidSchools) {
      let potentialSchools = [];
      for (const o of orgs) {
        const schs = this.validSchoolIds.get(o);
        if (schs) potentialSchools = potentialSchools.concat(Array.from(schs));
      }
      if (addToValidSchools > potentialSchools.length)
        throw new Error(
          'Cannot add a user to more valid schools than are currently configured'
        );
      for (const s of this.getRandomElements(
        potentialSchools,
        addToValidSchools
      ))
        schools.add(s);
    }
    for (const s of opts.schools) schools.add(s);

    const classes = new Set<string>();
    if (addToValidClasses) {
      let potentialClasses = [];
      for (const s of schools) {
        const classes = this.classesForSchool.get(s);
        if (classes)
          potentialClasses = potentialClasses.concat(Array.from(classes));
      }
      if (addToValidClasses > potentialClasses.length)
        throw new Error(
          'Cannot add a user to more valid classes than are currently configured'
        );
      for (const c of this.getRandomElements(
        potentialClasses,
        addToValidClasses
      ))
        classes.add(c);
    }
    for (const c of opts.classes) classes.add(c);

    const tempValidOrgId = Array.from(orgs)[0];
    // Generate the request
    const data = {
      ...baseUser,
      externalOrganizationUuid: tempValidOrgId,
      roleIdentifiersList:
        undefined !== opts.roleIdentifiersList &&
        opts.roleIdentifiersList.length > 0
          ? opts.roleIdentifiersList
          : opts.roles.get(tempValidOrgId) ||
            Array.from(this.validRoleIds.get(tempValidOrgId)),
      ...opts,
    };
    createEntityRequest
      .setExternalOrganizationUuid(data.externalOrganizationUuid)
      .setExternalUuid(data.externalUuid)
      .setGivenName(data.givenName)
      .setFamilyName(data.familyName)
      .setPhone(data.phone)
      .setEmail(data.email)
      .setDateOfBirth(data.dateOfBirth)
      .setUsername(data.username)
      .setGender(data.gender)
      .setRoleIdentifiersList(data.roleIdentifiersList);
    this.requests.push(new OnboardingRequest().setUser(createEntityRequest));

    for (const org of orgs) {
      if (!this.shouldOptimizeLinks) {
        // Add the user to an organization
        const linkEntity = new proto.AddUsersToOrganization()
          .setExternalOrganizationUuid(org)
          .setRoleIdentifiersList(
            undefined !== opts.roleIdentifiersList &&
              opts.roleIdentifiersList.length > 0
              ? opts.roleIdentifiersList
              : opts.roles.get(org) || Array.from(this.validRoleIds.get(org))
          )
          .setExternalUserUuidsList([data.externalUuid]);

        this.requests.push(
          new OnboardingRequest().setLinkEntities(
            new Link().setAddUsersToOrganization(linkEntity)
          )
        );
      }

      if (!this.usersInOrg.has(org)) this.usersInOrg.set(org, new Set());
      this.usersInOrg.get(org).add(data.externalUuid);
    }

    for (const sch of schools) {
      if (!this.shouldOptimizeLinks) {
        // Add the user to an organization
        const linkEntity = new proto.AddUsersToSchool()
          .setExternalSchoolUuid(sch)
          .setExternalUserUuidsList([data.externalUuid]);

        this.requests.push(
          new OnboardingRequest().setLinkEntities(
            new Link().setAddUsersToSchool(linkEntity)
          )
        );
      }

      if (!this.usersInSchool.has(sch)) this.usersInSchool.set(sch, new Set());
      this.usersInSchool.get(sch).add(data.externalUuid);
    }

    for (const cla of classes) {
      const isTeacher = opts.isTeacher || false;
      if (!this.shouldOptimizeLinks) {
        // Add the user to an organization
        const linkEntity = new proto.AddUsersToClass().setExternalClassUuid(
          cla
        );
        isTeacher
          ? linkEntity.setExternalTeacherUuidList([data.externalUuid])
          : linkEntity.setExternalStudentUuidList([data.externalUuid]);

        if (
          linkEntity.getExternalStudentUuidList().length > 0 ||
          linkEntity.getExternalTeacherUuidList().length > 0
        )
          this.requests.push(
            new OnboardingRequest().setLinkEntities(
              new Link().setAddUsersToClass(linkEntity)
            )
          );
      }

      if (!this.studentsInClasses.has(cla)) {
        this.studentsInClasses.set(cla, new Set());
        this.teachersInClasses.set(cla, new Set());
      }
      isTeacher
        ? this.teachersInClasses.get(cla).add(data.externalUuid)
        : this.studentsInClasses.get(cla).add(data.externalUuid);
    }

    isValid
      ? this.validUserIds.add(data.externalUuid)
      : this.invalidUserIds.add(data.externalUuid);
    return this;
  }

  // Customizablle User
  public addCustomizableUser(
    entity: Partial<proto.User.AsObject> & {
      addToValidOrgs?: number;
      addToValidSchools?: number;
      addToValidClasses?: number;
      orgs?: string[];
      schools?: string[];
      classes?: string[];
      isTeacher?: boolean;
      // K: Org ID
      roles?: Map<string, string[]>;
      externalUuid?: string;
      email?: string;
      phone?: string;
      username?: string;
      givenName?: string;
      familyName?: string;
      gender?: Gender;
      dateOfBirth?: string;
      isDuplicate?: boolean;
      userID?: string;
    } = {},
    isValid: boolean = true
  ): TestCaseBuilder {
    const suffix = uuidv4().slice(0, 7);
    const opts = {
      addToValidOrgs: 1,
      addToValidSchools: 1,
      addToValidClasses: 2,
      isTeacher: false,
      orgs: [],
      schools: [],
      classes: [],
      roles: new Map(),
      externalUuid: uuidv4(),
      email: `test${suffix}@test.com`,
      phone: `+9123456789`,
      username: `User${suffix}`,
      givenName: `First${suffix}`,
      familyName: `Last${suffix}`,
      gender: proto.Gender.MALE,
      dateOfBirth: '01-2017',
      isDuplicate: false,
      userID: uuidv4(),
      ...entity,
    };
    const { addToValidOrgs, addToValidSchools, addToValidClasses } = opts;

    const createEntityRequest = new proto.User();
    let baseUser;
    if (opts.isDuplicate) {
      baseUser = generateDuplicateUser(opts.userID);
    } else {
      baseUser = generateCustomUser({
        externalUuid: opts.externalUuid,
        email: opts.email,
        phone: opts.phone,
        username: opts.username,
        givenName: opts.givenName,
        familyName: opts.familyName,
      });
    }
    const orgs = new Set<string>();
    if (addToValidOrgs) {
      if (addToValidOrgs > this.validOrgIds.length)
        throw new Error(
          'Cannot add a user to more valid organizations than are currently configured'
        );
      while (orgs.size < addToValidOrgs) {
        for (const o of this.getRandomElements(
          this.validOrgIds,
          addToValidOrgs
        )) {
          orgs.add(o);
        }
      }
    }
    if (opts.externalOrganizationUuid) orgs.add(opts.externalOrganizationUuid);
    for (const o of opts.orgs) orgs.add(o);

    const schools = new Set<string>();
    if (addToValidSchools) {
      let potentialSchools = [];
      for (const o of orgs) {
        const schs = this.validSchoolIds.get(o);
        if (schs) potentialSchools = potentialSchools.concat(Array.from(schs));
      }
      if (addToValidSchools > potentialSchools.length)
        throw new Error(
          'Cannot add a user to more valid schools than are currently configured'
        );
      for (const s of this.getRandomElements(
        potentialSchools,
        addToValidSchools
      ))
        schools.add(s);
    }
    for (const s of opts.schools) schools.add(s);

    const classes = new Set<string>();
    if (addToValidClasses) {
      let potentialClasses = [];
      for (const s of schools) {
        const classes = this.classesForSchool.get(s);
        if (classes)
          potentialClasses = potentialClasses.concat(Array.from(classes));
      }
      if (addToValidClasses > potentialClasses.length)
        throw new Error(
          'Cannot add a user to more valid classes than are currently configured'
        );
      for (const c of this.getRandomElements(
        potentialClasses,
        addToValidClasses
      ))
        classes.add(c);
    }
    for (const c of opts.classes) classes.add(c);

    const tempValidOrgId = Array.from(orgs)[0];
    // Generate the request
    const data = {
      ...baseUser,
      externalOrganizationUuid: tempValidOrgId,
      roleIdentifiersList:
        undefined !== opts.roleIdentifiersList &&
        opts.roleIdentifiersList.length > 0
          ? opts.roleIdentifiersList
          : opts.roles.get(tempValidOrgId) ||
            Array.from(this.validRoleIds.get(tempValidOrgId)),
      ...opts,
    };
    createEntityRequest
      .setExternalOrganizationUuid(data.externalOrganizationUuid)
      .setExternalUuid(data.externalUuid)
      .setGivenName(data.givenName)
      .setFamilyName(data.familyName)
      .setPhone(data.phone)
      .setEmail(data.email)
      .setDateOfBirth(data.dateOfBirth)
      .setUsername(data.username)
      .setGender(data.gender)
      .setRoleIdentifiersList(data.roleIdentifiersList);
    this.requests.push(new OnboardingRequest().setUser(createEntityRequest));

    for (const org of orgs) {
      if (!this.shouldOptimizeLinks) {
        // Add the user to an organization
        const linkEntity = new proto.AddUsersToOrganization()
          .setExternalOrganizationUuid(org)
          .setRoleIdentifiersList(
            undefined !== opts.roleIdentifiersList &&
              opts.roleIdentifiersList.length > 0
              ? opts.roleIdentifiersList
              : opts.roles.get(org) || Array.from(this.validRoleIds.get(org))
          )
          .setExternalUserUuidsList([data.externalUuid]);

        this.requests.push(
          new OnboardingRequest().setLinkEntities(
            new Link().setAddUsersToOrganization(linkEntity)
          )
        );
      }

      if (!this.usersInOrg.has(org)) this.usersInOrg.set(org, new Set());
      this.usersInOrg.get(org).add(data.externalUuid);
    }

    for (const sch of schools) {
      if (!this.shouldOptimizeLinks) {
        // Add the user to an organization
        const linkEntity = new proto.AddUsersToSchool()
          .setExternalSchoolUuid(sch)
          .setExternalUserUuidsList([data.externalUuid]);

        this.requests.push(
          new OnboardingRequest().setLinkEntities(
            new Link().setAddUsersToSchool(linkEntity)
          )
        );
      }

      if (!this.usersInSchool.has(sch)) this.usersInSchool.set(sch, new Set());
      this.usersInSchool.get(sch).add(data.externalUuid);
    }

    for (const cla of classes) {
      const isTeacher = opts.isTeacher || false;
      if (!this.shouldOptimizeLinks) {
        // Add the user to an organization
        const linkEntity = new proto.AddUsersToClass().setExternalClassUuid(
          cla
        );
        isTeacher
          ? linkEntity.setExternalTeacherUuidList([data.externalUuid])
          : linkEntity.setExternalStudentUuidList([data.externalUuid]);

        this.requests.push(
          new OnboardingRequest().setLinkEntities(
            new Link().setAddUsersToClass(linkEntity)
          )
        );
      }

      if (!this.studentsInClasses.has(cla)) {
        this.studentsInClasses.set(cla, new Set());
        this.teachersInClasses.set(cla, new Set());
      }
      isTeacher
        ? this.teachersInClasses.get(cla).add(data.externalUuid)
        : this.studentsInClasses.get(cla).add(data.externalUuid);
    }

    isValid
      ? this.validUserIds.add(data.externalUuid)
      : this.invalidUserIds.add(data.externalUuid);
    return this;
  }

  private getRandomElement<T>(arr: T[] | Set<T>): T {
    const a = Array.isArray(arr) ? arr : Array.from(arr);
    return a[Math.floor(Math.random() * a.length)];
  }

  private getRandomElements<T>(arr: T[] | Set<T>, count: number = 1): T[] {
    const a = Array.isArray(arr) ? arr : Array.from(arr);
    const s = new Set<number>();
    if (count > a.length)
      throw new Error('Unable to get more elements than exist in array');
    while (s.size < count) {
      s.add(Math.floor(Math.random() * a.length));
    }
    const result = [];
    for (const i of s) {
      result.push(a[i]);
    }
    return result;
  }

  private generateOptimizedLinks(): TestCaseBuilder {
    if (!this.shouldOptimizeLinks) return this;

    for (const [schoolId, classIds] of this.classesForSchool) {
      const linkEntity = new proto.AddClassesToSchool()
        .setExternalSchoolUuid(schoolId)
        .setExternalClassUuidsList(Array.from(classIds));

      this.requests.push(
        new OnboardingRequest().setLinkEntities(
          new Link().setAddClassesToSchool(linkEntity)
        )
      );
    }

    for (const [orgId, userIds] of this.usersInOrg) {
      const linkEntity = new proto.AddUsersToOrganization()
        .setExternalOrganizationUuid(orgId)
        // This only uses valid role ids at the moment, does this need to support more?
        .setRoleIdentifiersList(this.validRoleIds.get(orgId))
        .setExternalUserUuidsList(Array.from(userIds));

      this.requests.push(
        new OnboardingRequest().setLinkEntities(
          new Link().setAddUsersToOrganization(linkEntity)
        )
      );
    }

    for (const [schoolId, userIds] of this.usersInSchool) {
      let usersToProcess = Array.from(userIds);
      while (usersToProcess.length > 0) {
        const data = usersToProcess.slice(0, 50);
        usersToProcess = usersToProcess.slice(50);
        const linkEntity = new proto.AddUsersToSchool()
          .setExternalSchoolUuid(schoolId)
          .setExternalUserUuidsList(data);

        this.requests.push(
          new OnboardingRequest().setLinkEntities(
            new Link().setAddUsersToSchool(linkEntity)
          )
        );
      }
    }

    for (const [classId, userIds] of this.studentsInClasses) {
      const linkEntity = new proto.AddUsersToClass()
        .setExternalClassUuid(classId)
        .setExternalStudentUuidList(Array.from(userIds));
      this.requests.push(
        new OnboardingRequest().setLinkEntities(
          new Link().setAddUsersToClass(linkEntity)
        )
      );
    }

    for (const [classId, userIds] of this.teachersInClasses) {
      const linkEntity = new proto.AddUsersToClass()
        .setExternalClassUuid(classId)
        .setExternalTeacherUuidList(Array.from(userIds));
      this.requests.push(
        new OnboardingRequest().setLinkEntities(
          new Link().setAddUsersToClass(linkEntity)
        )
      );
    }

    return this;
  }

  public finalize(shuffleReqs = false): proto.BatchOnboarding {
    if (this.shouldOptimizeLinks) this.generateOptimizedLinks();
    let reqs = this.requests.map((req, i) => {
      return req
        .setRequestId(new proto.RequestMetadata().setId(uuidv4()).setN(`${i}`))
        .setAction(proto.Action.CREATE);
    });
    if (shuffleReqs) reqs = shuffle(reqs);
    const req = new proto.BatchOnboarding();
    req.setRequestsList(reqs);
    return req;
  }
}

function generateValidSchool(orgId: string): proto.School.AsObject {
  const suffix = uuidv4().slice(0, 7);
  let shortCode = uuidv4();
  while (shortCode.includes('-')) {
    shortCode = shortCode.replace('-', '');
  }
  return {
    externalUuid: uuidv4(),
    externalOrganizationUuid: orgId,
    name: `Test School ${suffix}`,
    shortCode: shortCode.slice(0, 10),
  };
}

function generateValidClass(
  orgId: string,
  schoolId: string
): proto.Class.AsObject {
  const suffix = uuidv4().slice(0, 7);
  return {
    externalUuid: uuidv4(),
    externalOrganizationUuid: orgId,
    externalSchoolUuid: schoolId,
    name: `Test Class ${suffix}`,
  };
}

/**
 *
 * Note: This does not set Org Id or Roles
 *
 */
function generateUser(): Partial<proto.User.AsObject> {
  const suffix = uuidv4().slice(0, 7);
  return {
    externalUuid: uuidv4(),
    email: `test${suffix}@test.com`,
    phone: `+9123456789`,
    username: `User${suffix}`,
    givenName: `First${suffix}`,
    familyName: `Last${suffix}`,
    gender: proto.Gender.MALE,
    dateOfBirth: '01-2017',
  };
}

function generateCustomUser(
  entity: Partial<proto.User.AsObject> & {
    externalUuid?: string;
    email?: string;
    phone?: string;
    username?: string;
    givenName?: string;
    familyName?: string;
    gender?: string;
    dateOfBirth?: Date;
  } = {}
): Partial<proto.User.AsObject> {
  const suffix = uuidv4().slice(0, 7);
  const opts = {
    externalUuid: uuidv4(),
    email: `test${suffix}@test.com`,
    phone: `+9123456789`,
    username: `User${suffix}`,
    givenName: `First${suffix}`,
    familyName: `Last${suffix}`,
    gender: proto.Gender.MALE,
    dateOfBirth: '01-2017',
    ...entity,
  };
  return opts;
}

function generateDuplicateUser(suffix): Partial<proto.User.AsObject> {
  return {
    externalUuid: suffix,
    email: `test${suffix}@test.com`,
    phone: `+9123456789`,
    username: `User${suffix}`,
    givenName: `First${suffix}`,
    familyName: `Last${suffix}`,
    gender: proto.Gender.MALE,
    dateOfBirth: '01-2017',
  };
}

function shuffle<T>(array: T[]): T[] {
  let currentIndex = array.length;
  let randomIndex: number;

  // While there remain elements to shuffle...
  while (currentIndex !== 0) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }

  return array;
}
