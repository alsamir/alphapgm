import { Controller, Post, Body, Res, Req, UseGuards, HttpCode, HttpStatus, Get } from '@nestjs/common';
import { Response, Request } from 'express';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('register')
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  async register(
    @Body() body: { email: string; username: string; password: string; firstName?: string; lastName?: string; name?: string; phone?: string; turnstileToken?: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(body);
    this.setRefreshTokenCookie(res, result.tokens.refreshToken);
    return {
      success: true,
      data: {
        user: result.user,
        tokens: { accessToken: result.tokens.accessToken },
      },
    };
  }

  @Public()
  @Post('login')
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: { email: string; password: string; turnstileToken?: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(body.email, body.password, body.turnstileToken);
    this.setRefreshTokenCookie(res, result.tokens.refreshToken);
    return {
      success: true,
      data: {
        user: result.user,
        tokens: { accessToken: result.tokens.accessToken },
      },
    };
  }

  @Public()
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @CurrentUser('userId') userId: number,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.refreshTokens(BigInt(userId));
    this.setRefreshTokenCookie(res, tokens.refreshToken);
    return {
      success: true,
      data: { tokens: { accessToken: tokens.accessToken } },
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/v1/auth/refresh',
    });
    return { success: true, message: 'Logged out successfully' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getMe(@CurrentUser() user: any) {
    return { success: true, data: user };
  }

  private setRefreshTokenCookie(res: Response, token: string) {
    res.cookie('refreshToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/v1/auth/refresh',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }
}
