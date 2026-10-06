import { SetMetadata } from '@nestjs/common';
import { GlobalRole } from '../../../../user/domain/enum/global-role.enum.js';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: GlobalRole[]) => SetMetadata(ROLES_KEY, roles);
