import { School } from '../../../domain/entities/school.entity.js';
import { SchoolEntity } from '../typeorm/school.entity.js';

export class SchoolMapper {
  static toDomain(entity: SchoolEntity): School {
    return School.reconstitute({
      id: entity.id,
      name: entity.name,
      phoneNumber: entity.phoneNumber,
      email: entity.email,
      website: entity.website,
      status: entity.status,
      createdAt: new Date(entity.createdAt),
      updatedAt: new Date(entity.updatedAt),
      createdBy: entity.createdBy,
    });
  }

  static toPersistence(school: School): SchoolEntity {
    const primitives = school.toPrimitives();
    const entity = new SchoolEntity();
    
    if (primitives.id) {
      entity.id = primitives.id;
    }
    entity.name = primitives.name;
    entity.phoneNumber = primitives.phoneNumber;
    entity.email = primitives.email;
    entity.website = primitives.website;
    entity.status = primitives.status;
    entity.createdAt = primitives.createdAt.getTime();
    entity.updatedAt = primitives.updatedAt.getTime();
    entity.createdBy = primitives.createdBy;

    return entity;
  }
}
