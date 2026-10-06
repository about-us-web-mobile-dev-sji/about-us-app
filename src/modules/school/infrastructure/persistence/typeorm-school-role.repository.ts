import { In, Not, Repository } from 'typeorm';
import { SchoolRoleEntity } from './typeorm/school-role.entity.js';
import { PermissionEntity } from './typeorm/permission.entity.js';
import { SchoolRole } from '../../domain/entities/school-role.entity.js';
import { SchoolAction } from '../../domain/enums/school-action.enum.js';
import { InvalidSchoolRoleException } from '../../domain/exceptions/invalid-school-role.exception.js';
import type { SchoolRoleKey } from '../../domain/enums/school-role-key.enum.js';
import type { SchoolRoleRepository } from '../../domain/repositories/i-school-role.repository.js';
import { SchoolRoleMapper } from './mappers/school-role.mapper.js';

export class TypeormSchoolRoleRepository implements SchoolRoleRepository {
  constructor(private readonly repo: Repository<SchoolRoleEntity>) {}

  async ensurePermissionCatalogue(): Promise<void> {
    const permissions = this.repo.manager.getRepository(PermissionEntity);
    const codes = Object.values(SchoolAction);
    await permissions.upsert(
      codes.map((code) => ({ code, description: null })),
      ['code'],
    );
    // Codes that left the catalogue disappear with their role assignments.
    await permissions.delete({ code: Not(In(codes)) });
  }

  async findById(id: string): Promise<SchoolRole | null> {
    const entity = await this.repo.findOneBy({ id });
    return entity ? SchoolRoleMapper.toDomain(entity) : null;
  }

  async findByIds(ids: string[]): Promise<SchoolRole[]> {
    if (ids.length === 0) {
      return [];
    }
    const entities = await this.repo.findBy({ id: In(ids) });
    return entities.map((e) => SchoolRoleMapper.toDomain(e));
  }

  async findBySchool(schoolId: string): Promise<SchoolRole[]> {
    const entities = await this.repo.find({
      where: { schoolId },
      order: { createdAt: 'ASC' },
    });
    return entities.map((e) => SchoolRoleMapper.toDomain(e));
  }

  async findByKey(schoolId: string, key: SchoolRoleKey): Promise<SchoolRole | null> {
    const entity = await this.repo.findOneBy({ schoolId, key });
    return entity ? SchoolRoleMapper.toDomain(entity) : null;
  }

  async existsByName(
    schoolId: string,
    name: string,
    excludeId?: string,
  ): Promise<boolean> {
    const query = this.repo
      .createQueryBuilder('r')
      .where('r.schoolId = :schoolId', { schoolId })
      .andWhere('LOWER(r.name) = LOWER(:name)', { name: name.trim() });
    if (excludeId) {
      query.andWhere('r.id <> :excludeId', { excludeId });
    }
    return (await query.getCount()) > 0;
  }

  async save(role: SchoolRole): Promise<SchoolRole> {
    const entity = SchoolRoleMapper.toPersistence(role);
    const codes = [...role.permissions];
    if (codes.length) {
      await this.repo.manager.getRepository(PermissionEntity).upsert(
        codes.map((code) => ({ code, description: null })),
        ['code'],
      );
    }
    const permissions = codes.length
      ? await this.repo.manager
          .getRepository(PermissionEntity)
          .findBy({ code: In(codes) })
      : [];
    if (permissions.length !== codes.length) {
      throw new InvalidSchoolRoleException('Every role permission must exist in the permission catalogue');
    }
    entity.permissions = permissions;
    const saved = await this.repo.save(entity);
    return SchoolRoleMapper.toDomain(saved);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete({ id });
  }
}
