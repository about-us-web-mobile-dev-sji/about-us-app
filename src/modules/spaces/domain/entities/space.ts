import { UUID } from 'crypto';
import { SpaceKind } from '../enums/space-kind.js';
import { SpaceStatus } from '../enums/space-status.js';
import { SpacePath } from '../value-objects/space-path.js';
import { MemberDesignation } from '../value-objects/member-designation.js';
import {
  SpaceRootMoveForbiddenException,
  SpaceRootDeleteForbiddenException,
  SpaceAlreadyArchivedException,
  SpaceNotArchivedException,
  SpaceDeletedException,
  SpaceCrossSchoolMoveForbiddenException,
  SpaceInsertParentOnRootForbiddenException,
} from '../exceptions/space.exceptions.js';

export interface SpaceProps {
  id?: UUID;
  schoolId: UUID;
  parentId: UUID | null;
  path: SpacePath;
  depth: number;
  kind: SpaceKind;
  name: string;
  description: string | null;
  memberDesignation: MemberDesignation | null;
  status: SpaceStatus;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
  deletedAt: Date | null;
}

export type NewSpace = Omit<SpaceProps, 'id' | 'version' | 'createdAt' | 'updatedAt' | 'archivedAt' | 'deletedAt'>;

export class Space {
  private constructor(private props: SpaceProps) {}

  static createRoot(input: {
    schoolId: UUID;
    name: string;
    description?: string | null;
    memberDesignation?: MemberDesignation | null;
  }): Space {
    const now = new Date();
    const spaceId = crypto.randomUUID();
    const path = SpacePath.createRoot(spaceId);

    const props: SpaceProps = {
      id: spaceId,
      schoolId: input.schoolId,
      parentId: null,
      path,
      depth: 0,
      kind: SpaceKind.SCHOOL_ROOT,
      name: input.name.trim(),
      description: input.description?.trim() ?? null,
      memberDesignation: input.memberDesignation ?? null,
      status: SpaceStatus.ACTIVE,
      version: 1,
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
      deletedAt: null,
    };

    return new Space(props);
  }

  static createStandard(input: {
    parent: Space;
    name: string;
    description?: string | null;
    memberDesignation?: MemberDesignation | null;
  }): Space {
    if (input.parent.isDeleted()) throw new SpaceDeletedException(input.parent.id!);
    // Root CAN be a parent for standard spaces - this is the normal case

    const now = new Date();
    const spaceId = crypto.randomUUID();
    const path = SpacePath.createChild(input.parent.path, spaceId);
    const depth = input.parent.depth + 1;

    const props: SpaceProps = {
      id: spaceId,
      schoolId: input.parent.schoolId,
      parentId: input.parent.id!,
      path,
      depth,
      kind: SpaceKind.STANDARD,
      name: input.name.trim(),
      description: input.description?.trim() ?? null,
      memberDesignation: input.memberDesignation ?? null,
      status: SpaceStatus.ACTIVE,
      version: 1,
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
      deletedAt: null,
    };

    return new Space(props);
  }

  static createInsertedParent(input: {
    oldParent: Space;
    child: Space;
    name: string;
    description?: string | null;
    memberDesignation?: MemberDesignation | null;
  }): Space {
    if (input.child.isRoot()) throw new SpaceRootMoveForbiddenException();
    if (input.oldParent.schoolId !== input.child.schoolId) throw new SpaceCrossSchoolMoveForbiddenException();
    // Inserting between root and its child is ALLOWED - that's the normal use case
    // Only forbidden: making the root a child of another node (handled above)

    const now = new Date();
    const spaceId = crypto.randomUUID();
    const path = SpacePath.createChild(input.oldParent.path, spaceId);
    const depth = input.oldParent.depth + 1;

    const props: SpaceProps = {
      id: spaceId,
      schoolId: input.oldParent.schoolId,
      parentId: input.oldParent.id!,
      path,
      depth,
      kind: SpaceKind.STANDARD,
      name: input.name.trim(),
      description: input.description?.trim() ?? null,
      memberDesignation: input.memberDesignation ?? null,
      status: SpaceStatus.ACTIVE,
      version: 1,
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
      deletedAt: null,
    };

    return new Space(props);
  }

  static reconstitute(props: SpaceProps): Space {
    return new Space({
      ...props,
      path: SpacePath.reconstitute(props.path.value),
    });
  }

  get id(): UUID | undefined {
    return this.props.id;
  }

  get schoolId(): UUID {
    return this.props.schoolId;
  }

  get parentId(): UUID | null {
    return this.props.parentId;
  }

  get path(): SpacePath {
    return this.props.path;
  }

  get depth(): number {
    return this.props.depth;
  }

  get kind(): SpaceKind {
    return this.props.kind;
  }

  get name(): string {
    return this.props.name;
  }

  get description(): string | null {
    return this.props.description;
  }

  get memberDesignation(): MemberDesignation | null {
    return this.props.memberDesignation;
  }

  get status(): SpaceStatus {
    return this.props.status;
  }

  get version(): number {
    return this.props.version;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get archivedAt(): Date | null {
    return this.props.archivedAt;
  }

  get deletedAt(): Date | null {
    return this.props.deletedAt;
  }

  isRoot(): boolean {
    return this.props.kind === SpaceKind.SCHOOL_ROOT;
  }

  isStandard(): boolean {
    return this.props.kind === SpaceKind.STANDARD;
  }

  isActive(): boolean {
    return this.props.status === SpaceStatus.ACTIVE;
  }

  isArchived(): boolean {
    return this.props.status === SpaceStatus.ARCHIVED;
  }

  isDeleted(): boolean {
    return this.props.deletedAt !== null;
  }

  canBeMoved(): boolean {
    return !this.isRoot() && !this.isDeleted();
  }

  canBeDeleted(): boolean {
    return !this.isRoot() && !this.isDeleted();
  }

  rename(newName: string): void {
    if (!newName?.trim()) throw new Error('Space name is required');
    this.props.name = newName.trim();
    this.touch();
  }

  updateDescription(description: string | null): void {
    this.props.description = description?.trim() ?? null;
    this.touch();
  }

  setMemberDesignation(designation: MemberDesignation | null): void {
    this.props.memberDesignation = designation;
    this.touch();
  }

  archive(): void {
    if (this.isDeleted()) throw new SpaceDeletedException(this.props.id!);
    if (this.isArchived()) throw new SpaceAlreadyArchivedException();
    this.props.status = SpaceStatus.ARCHIVED;
    this.props.archivedAt = new Date();
    this.touch();
  }

  restore(): void {
    if (this.isDeleted()) throw new SpaceDeletedException(this.props.id!);
    if (!this.isArchived()) throw new SpaceNotArchivedException();
    this.props.status = SpaceStatus.ACTIVE;
    this.props.archivedAt = null;
    this.touch();
  }

  softDelete(): void {
    if (this.isRoot()) throw new SpaceRootDeleteForbiddenException();
    if (this.isDeleted()) throw new SpaceDeletedException(this.props.id!);
    this.props.deletedAt = new Date();
    this.props.status = SpaceStatus.ARCHIVED;
    this.props.archivedAt = new Date();
    this.touch();
  }

  moveTo(newParent: Space): { oldPath: string; newPath: string; depthDelta: number } {
    if (!this.canBeMoved()) throw new SpaceRootMoveForbiddenException();
    if (this.props.schoolId !== newParent.schoolId) throw new SpaceCrossSchoolMoveForbiddenException();
    if (this.props.id === newParent.props.id) throw new Error('Cannot move space under itself');
    if (newParent.path.isDescendantOf(this.props.path)) throw new Error('Cannot move space under its own descendant');

    const oldPath = this.props.path.value;
    const newPath = SpacePath.createChild(newParent.path, this.props.id!).value;
    const depthDelta = (newParent.depth + 1) - this.props.depth;

    this.props.parentId = newParent.props.id!;
    this.props.path = new SpacePath(newPath);
    this.props.depth = newParent.depth + 1;
    this.touch();

    return { oldPath, newPath, depthDelta };
  }

  updatePathAndDepth(newPath: SpacePath, depthDelta: number): void {
    this.props.path = newPath;
    this.props.depth += depthDelta;
    this.touch();
  }

  private touch(): void {
    this.props.updatedAt = new Date();
    this.props.version += 1;
  }

  toPrimitives(): SpaceProps {
    return {
      ...this.props,
      path: this.props.path,
    };
  }
}