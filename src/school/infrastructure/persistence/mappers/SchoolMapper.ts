import { School } from '../../../domain/entities/School.js';
import { SchoolPersistenceModel } from '../entities/SchoolPersistenceModel.js';

export class SchoolMapper {
  static toDomain(model: SchoolPersistenceModel): School {
    return new School(
      model.id,
      model.identifier,
      model.name,
      model.description,
      model.address,
      model.city,
      model.postalCode,
      model.country,
      model.status,
      model.mainAdministratorId,
      model.createdBy,
      model.createdAt,
      model.updatedAt,
    );
  }

  static toPersistence(school: School): SchoolPersistenceModel {
    const model = new SchoolPersistenceModel();
    model.id = school.getId();
    model.identifier = school.getIdentifier();
    model.name = school.getName();
    model.description = school.getDescription();
    model.address = school.getAddress();
    model.city = school.getCity();
    model.postalCode = school.getPostalCode();
    model.country = school.getCountry();
    model.status = school.getStatus();
    model.mainAdministratorId = school.getMainAdministratorId();
    model.createdBy = school.getCreatedBy();
    model.createdAt = school.getCreatedAt();
    model.updatedAt = school.getUpdatedAt();
    return model;
  }
}
