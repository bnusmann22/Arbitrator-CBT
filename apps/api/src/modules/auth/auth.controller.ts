import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { CandidateLoginDto } from './dto/candidate-login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtPayload } from './strategies/jwt.strategy';

const COOKIE_NAME = 'auth_token';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private setCookie(res: Response, token: string): void {
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    const maxAge = Number(this.configService.get('JWT_EXPIRATION', '3600')) * 1000;

    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge,
      path: '/',
    });
  }

  private clearCookie(res: Response): void {
    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });
  }

  // ─── POST /api/auth/admin/login ───────────────────────────────────────────

  @Post('admin/login')
  @HttpCode(HttpStatus.OK)
  async adminLogin(
    @Body() dto: AdminLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.authService.validateAdmin(dto);
    const token = this.authService.signToken(user);
    this.setCookie(res, token);

    return {
      message: 'Login successful.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  // ─── POST /api/auth/candidate/login ───────────────────────────────────────

  @Post('candidate/login')
  @HttpCode(HttpStatus.OK)
  async candidateLogin(
    @Body() dto: CandidateLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.authService.validateCandidate(dto);
    const token = this.authService.signToken(user);
    this.setCookie(res, token);

    return {
      message: 'Login successful.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  // ─── POST /api/auth/logout ────────────────────────────────────────────────

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) res: Response) {
    this.clearCookie(res);
    return { message: 'Logged out successfully.' };
  }

  // ─── GET /api/auth/me ─────────────────────────────────────────────────────

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() payload: JwtPayload) {
    const user = await this.authService.getMe(payload);
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  }
}
