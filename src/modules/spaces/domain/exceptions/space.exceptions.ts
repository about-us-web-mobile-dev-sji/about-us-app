export class SpaceException extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'SpaceException';
  }
}

export class SpaceNotFoundException extends SpaceException {
  constructor(id: string) {
    super(`Space ${id} not found`, 'SPACE_NOT_FOUND');
    this.name = 'SpaceNotFoundException';
  }
}

export class SpaceParentNotFoundException extends SpaceException {
  constructor(parentId: string) {
    super(`Parent space ${parentId} not found`, 'SPACE_PARENT_NOT_FOUND');
    this.name = 'SpaceParentNotFoundException';
  }
}

export class SpaceParentRequiredException extends SpaceException {
  constructor() {
    super('Parent space is required for STANDARD spaces', 'SPACE_PARENT_REQUIRED');
    this.name = 'SpaceParentRequiredException';
  }
}

export class SpaceRootMoveForbiddenException extends SpaceException {
  constructor() {
    super('Cannot move the school root space', 'SPACE_ROOT_MOVE_FORBIDDEN');
    this.name = 'SpaceRootMoveForbiddenException';
  }
}

export class SpaceRootDeleteForbiddenException extends SpaceException {
  constructor() {
    super('Cannot delete the school root space via normal operations', 'SPACE_ROOT_DELETE_FORBIDDEN');
    this.name = 'SpaceRootDeleteForbiddenException';
  }
}

export class SpaceCrossSchoolMoveForbiddenException extends SpaceException {
  constructor() {
    super('Cannot move space across different schools', 'SPACE_CROSS_SCHOOL_MOVE_FORBIDDEN');
    this.name = 'SpaceCrossSchoolMoveForbiddenException';
  }
}

export class SpaceCycleDetectedException extends SpaceException {
  constructor() {
    super('Operation would create a cycle in the space hierarchy', 'SPACE_CYCLE_DETECTED');
    this.name = 'SpaceCycleDetectedException';
  }
}

export class SpaceInvalidParentException extends SpaceException {
  constructor(reason: string) {
    super(`Invalid parent: ${reason}`, 'SPACE_INVALID_PARENT');
    this.name = 'SpaceInvalidParentException';
  }
}

export class SpaceHasChildrenException extends SpaceException {
  constructor() {
    super('Space has children and cannot be deleted', 'SPACE_HAS_CHILDREN');
    this.name = 'SpaceHasChildrenException';
  }
}

export class SpaceAlreadyArchivedException extends SpaceException {
  constructor() {
    super('Space is already archived', 'SPACE_ALREADY_ARCHIVED');
    this.name = 'SpaceAlreadyArchivedException';
  }
}

export class SpaceNotArchivedException extends SpaceException {
  constructor() {
    super('Space is not archived', 'SPACE_NOT_ARCHIVED');
    this.name = 'SpaceNotArchivedException';
  }
}

export class SpaceMemberAlreadyExistsException extends SpaceException {
  constructor(userId: string, spaceId: string) {
    super(`User ${userId} is already a member of space ${spaceId}`, 'SPACE_MEMBER_ALREADY_EXISTS');
    this.name = 'SpaceMemberAlreadyExistsException';
  }
}

export class SpaceMemberNotFoundException extends SpaceException {
  constructor(userId: string, spaceId: string) {
    super(`Membership not found for user ${userId} in space ${spaceId}`, 'SPACE_MEMBER_NOT_FOUND');
    this.name = 'SpaceMemberNotFoundException';
  }
}

export class SpaceManagerAlreadyAssignedException extends SpaceException {
  constructor(spaceId: string) {
    super(`Space ${spaceId} already has an active manager`, 'SPACE_MANAGER_ALREADY_ASSIGNED');
    this.name = 'SpaceManagerAlreadyAssignedException';
  }
}

export class SpaceManagerNotFoundException extends SpaceException {
  constructor(spaceId: string) {
    super(`No active manager found for space ${spaceId}`, 'SPACE_MANAGER_NOT_FOUND');
    this.name = 'SpaceManagerNotFoundException';
  }
}

export class SpaceManagementForbiddenException extends SpaceException {
  constructor() {
    super('User cannot manage this space', 'SPACE_MANAGEMENT_FORBIDDEN');
    this.name = 'SpaceManagementForbiddenException';
  }
}

export class SchoolRootAlreadyExistsException extends SpaceException {
  constructor(schoolId: string) {
    super(`School ${schoolId} already has a root space`, 'SCHOOL_ROOT_ALREADY_EXISTS');
    this.name = 'SchoolRootAlreadyExistsException';
  }
}

export class SpaceInsertParentOnRootForbiddenException extends SpaceException {
  constructor() {
    super('Cannot insert a parent above the school root', 'SPACE_INSERT_PARENT_ON_ROOT_FORBIDDEN');
    this.name = 'SpaceInsertParentOnRootForbiddenException';
  }
}

export class SpaceDeletedException extends SpaceException {
  constructor(spaceId: string) {
    super(`Space ${spaceId} has been deleted`, 'SPACE_DELETED');
    this.name = 'SpaceDeletedException';
  }
}