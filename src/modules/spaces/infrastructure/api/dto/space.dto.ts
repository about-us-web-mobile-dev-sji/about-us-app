import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, IsEnum, ValidateNested, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { SpaceKind } from '../../../domain/enums/space-kind.js';
import { SpaceStatus } from '../../../domain/enums/space-status.js';
import { SpaceMembershipRole } from '../../../domain/enums/space-membership-role.js';
import { SpaceMembershipStatus } from '../../../domain/enums/space-membership-status.js';
import { MemberDesignation } from '../../../domain/value-objects/member-designation.js';

export class MemberDesignationDto {
  @ApiProperty()
  @IsString()
  key: string;

  @ApiProperty()
  @IsString()
  singular: string;

  @ApiProperty()
  @IsString()
  plural: string;

  static fromDomain(designation: MemberDesignation): MemberDesignationDto {
    const dto = new MemberDesignationDto();
    dto.key = designation.key;
    dto.singular = designation.singular;
    dto.plural = designation.plural;
    return dto;
  }

  toDomain(): MemberDesignation {
    return MemberDesignation.create(this.key, this.singular, this.plural);
  }
}

export class CreateSpaceDto {
  @ApiProperty()
  @IsUUID()
  parentId: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ type: MemberDesignationDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => MemberDesignationDto)
  memberDesignation?: MemberDesignationDto | null;
}

export class InsertParentDto {
  @ApiProperty()
  @IsUUID()
  childId: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ type: MemberDesignationDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => MemberDesignationDto)
  memberDesignation?: MemberDesignationDto | null;
}

export class MoveSpaceDto {
  @ApiProperty()
  @IsUUID()
  newParentId: string;
}

export class UpdateMemberDesignationDto {
  @ApiPropertyOptional({ type: MemberDesignationDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => MemberDesignationDto)
  memberDesignation?: MemberDesignationDto | null;
}

export class AddMemberDto {
  @ApiProperty()
  @IsUUID()
  userId: string;

  @ApiProperty({ enum: SpaceMembershipRole })
  @IsEnum(SpaceMembershipRole)
  role: SpaceMembershipRole;
}

export class AssignManagerDto {
  @ApiProperty()
  @IsUUID()
  userId: string;
}

export class GetChildrenQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 10;

  @ApiPropertyOptional({ enum: SpaceStatus })
  @IsOptional()
  @IsEnum(SpaceStatus)
  status?: SpaceStatus;

  @ApiPropertyOptional({ enum: SpaceKind })
  @IsOptional()
  @IsEnum(SpaceKind)
  kind?: SpaceKind;
}

export class GetSubtreeQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxDepth?: number;
}

export class EnsureSchoolRootDto {
  @ApiProperty()
  @IsUUID()
  schoolId: string;

  @ApiProperty()
  @IsString()
  name: string;
}

export class SpaceResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  schoolId: string;

  @ApiPropertyOptional()
  parentId?: string | null;

  @ApiProperty()
  path: string;

  @ApiProperty()
  depth: number;

  @ApiProperty({ enum: SpaceKind })
  kind: SpaceKind;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiPropertyOptional({ type: MemberDesignationDto })
  memberDesignation?: MemberDesignationDto | null;

  @ApiProperty({ enum: SpaceStatus })
  status: SpaceStatus;

  @ApiProperty()
  version: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  archivedAt?: Date | null;

  @ApiPropertyOptional()
  deletedAt?: Date | null;

  static fromDomain(space: any): SpaceResponseDto {
    const dto = new SpaceResponseDto();
    const p = space.toPrimitives ? space.toPrimitives() : space;
    dto.id = p.id;
    dto.schoolId = p.schoolId;
    dto.parentId = p.parentId ?? null;
    dto.path = p.path?.value ?? p.path;
    dto.depth = p.depth;
    dto.kind = p.kind;
    dto.name = p.name;
    dto.description = p.description ?? null;
    dto.memberDesignation = p.memberDesignation
      ? MemberDesignationDto.fromDomain(p.memberDesignation)
      : null;
    dto.status = p.status;
    dto.version = p.version;
    dto.createdAt = p.createdAt;
    dto.updatedAt = p.updatedAt;
    dto.archivedAt = p.archivedAt ?? null;
    dto.deletedAt = p.deletedAt ?? null;
    return dto;
  }
}

export class SpaceMembershipResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  spaceId: string;

  @ApiProperty()
  userId: string;

  @ApiProperty({ enum: SpaceMembershipRole })
  role: SpaceMembershipRole;

  @ApiProperty({ enum: SpaceMembershipStatus })
  status: SpaceMembershipStatus;

  @ApiPropertyOptional()
  grantedBy?: string | null;

  @ApiProperty()
  grantedAt: Date;

  @ApiPropertyOptional()
  revokedAt?: Date | null;

  @ApiPropertyOptional()
  revokedBy?: string | null;

  static fromDomain(membership: any): SpaceMembershipResponseDto {
    const dto = new SpaceMembershipResponseDto();
    const p = membership.toPrimitives ? membership.toPrimitives() : membership;
    dto.id = p.id;
    dto.spaceId = p.spaceId;
    dto.userId = p.userId;
    dto.role = p.role;
    dto.status = p.status;
    dto.grantedBy = p.grantedBy ?? null;
    dto.grantedAt = p.grantedAt;
    dto.revokedAt = p.revokedAt ?? null;
    dto.revokedBy = p.revokedBy ?? null;
    return dto;
  }
}

export class GetEffectiveManagersResponseDto {
  @ApiProperty()
  spaceId: string;

  @ApiPropertyOptional({ type: SpaceMembershipResponseDto })
  directManager?: SpaceMembershipResponseDto | null;

  @ApiProperty({ type: [SpaceMembershipResponseDto] })
  inheritedManagers: SpaceMembershipResponseDto[];
}

export class GetEffectiveMemberDesignationResponseDto {
  @ApiProperty()
  spaceId: string;

  @ApiPropertyOptional({ type: MemberDesignationDto })
  localDesignation?: MemberDesignationDto | null;

  @ApiPropertyOptional({ type: MemberDesignationDto })
  effectiveDesignation?: MemberDesignationDto | null;

  @ApiPropertyOptional()
  inheritedFromSpaceId?: string | null;
}

export class GetSpacesByDesignationKeyQueryDto {
  @ApiProperty()
  @IsUUID()
  schoolId: string;

  @ApiProperty()
  @IsString()
  designationKey: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 10;
}

export class PaginatedResponseDto<T> {
  @ApiProperty({ type: [Object] })
  items: T[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}

export class GetSpacesByDesignationKeyOutputItem {
  @ApiProperty()
  id: string;

  @ApiProperty()
  schoolId: string;

  @ApiPropertyOptional()
  parentId?: string | null;

  @ApiProperty()
  path: string;

  @ApiProperty()
  depth: number;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional({ type: MemberDesignationDto })
  memberDesignation?: MemberDesignationDto | null;
}

export class GetSpacesByDesignationKeyOutput {
  @ApiProperty({ type: [GetSpacesByDesignationKeyOutputItem] })
  items: GetSpacesByDesignationKeyOutputItem[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}