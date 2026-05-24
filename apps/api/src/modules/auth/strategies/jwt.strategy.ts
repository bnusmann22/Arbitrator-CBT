import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { Request } from 'express';
import { UserRole } from '@arbitration/types';

export interface JwtPayload {
  sub: string;       // user document ID in Firestore
  email: string;
  name: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

/**
 * Extracts the JWT from the `auth_token` httpOnly cookie.
 * Falls back to Bearer header for API clients / SSR fetches.
 */
function cookieExtractor(req: Request): string | null {
  if (req && req.cookies) {
    return (req.cookies['auth_token'] as string) ?? null;
  }
  return null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'change-this-secret'),
    });
  }

  /**
   * Called after the token is verified.
   * Whatever is returned here is attached to `request.user`.
   */
  async validate(payload: JwtPayload): Promise<JwtPayload> {
    if (!payload.sub || !payload.role) {
      throw new UnauthorizedException('Invalid token payload.');
    }
    return payload;
  }
}
