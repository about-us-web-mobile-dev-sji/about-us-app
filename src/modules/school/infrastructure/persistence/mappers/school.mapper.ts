import { School } from '../../../domain/entities/school.entity.js';
import { SchoolEntity } from '../typeorm/school.entity.js';

export class SchoolMapper {
  static toDomain(entity: SchoolEntity): School {
    return School.reconstitute({
      id: entity.id as any,
      name: entity.name,
      address: entity.address,
      city: entity.city,
      postalCode: entity.postalCode,
      country: entity.country,
      phoneNumber: entity.phoneNumber,
      email: entity.email,
      website: entity.website,
      status: entity.status,
      adminUserId: entity.adminUserId,
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
    entity.address = primitives.address;
    entity.city = primitives.city;
    entity.postalCode = primitives.postalCode;
    entity.country = primitives.country;
    entity.phoneNumber = primitives.phoneNumber;
    entity.email = primitives.email;
    entity.website = primitives.website;
    entity.status = primitives.status;
    entity.adminUserId = primitives.adminUserId;
    entity.createdAt = primitives.createdAt.getTime();
    entity.updatedAt = primitives.updatedAt.getTime();
    entity.createdBy = primitives.createdBy;

    return entity;
  }
}
