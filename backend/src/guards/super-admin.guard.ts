import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

/**
 * SuperAdminGuard
 *
 * Restricts access to super_admin and company_owner roles only.
 * Used to protect the master admin panel endpoints.
 */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    if (user.role !== 'super_admin') {
      throw new ForbiddenException(
        'This endpoint is restricted to platform super administrators.',
      );
    }

    return true;
  }
}
