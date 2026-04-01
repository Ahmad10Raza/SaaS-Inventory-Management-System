import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  PERMISSIONS_KEY,
  ROLE_HIERARCHY,
  DEFAULT_ROLE_PERMISSIONS,
} from '../constants/permissions';

export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);


@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No permissions required = public route (but still needs auth)
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Access denied');
    }

    // Super admin and company owner have full access
    if (user.role === 'super_admin' || user.role === 'company_owner') {
      return true;
    }

    // Check user's custom permissions first, then fall back to role defaults
    const userPermissions = (user.permissions && user.permissions.length > 0)
      ? user.permissions
      : DEFAULT_ROLE_PERMISSIONS[user.role] || [];

    // Wildcard = full access
    if (userPermissions.includes('*')) {
      return true;
    }

    // New logic: check if user has EXACT permission or module.* permission
    const hasPermission = requiredPermissions.every((required) => {
      // Direct match
      if (userPermissions.includes(required)) return true;
      
      // Module wildcard match (e.g. 'product.*' allows 'product.create')
      const moduleName = required.split('.')[0];
      if (userPermissions.includes(`${moduleName}.*`)) return true;
      
      return false;
    });

    if (!hasPermission) {
      throw new ForbiddenException(
        `You do not have permission to perform this action. Required: ${requiredPermissions.join(', ')}`,
      );
    }

    return true;
  }
}
