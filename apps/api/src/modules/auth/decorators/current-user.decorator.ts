import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

/**
 * Extracts the authenticated user from the request object.
 * Usage: @CurrentUser() user: JwtPayload
 *
 * Populated by JwtStrategy.validate() after the JWT is verified.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user;
  },
);
