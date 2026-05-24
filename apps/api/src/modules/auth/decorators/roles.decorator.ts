import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@arbitration/types';

export const ROLES_KEY = 'roles';

/**
 * Attach required roles to a route handler.
 * Usage: @Roles(UserRole.ADMIN)  or  @Roles(UserRole.ADMIN, UserRole.CANDIDATE)
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
