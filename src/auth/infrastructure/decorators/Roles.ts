import { SetMetadata } from '@nestjs/common';
import { Role } from '../../../shared/domain/enums/Role.js';

export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);
