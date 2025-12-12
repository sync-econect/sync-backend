import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { LoginDto, ChangePasswordDto, RegisterDto } from './dto';

export interface JwtPayload {
  sub: number;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  id: number;
  email: string;
  name: string;
  role: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: number;
    email: string;
    name: string;
    role: string;
  };
}

const SALT_ROUNDS = 12;

@Injectable()
export class AuthService {
  private readonly jwtExpiresIn: number;
  private readonly refreshExpiresIn: number;
  private readonly inactivityTimeout: number;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.jwtExpiresIn = parseInt(
      this.configService.get('JWT_EXPIRES_IN', '3600'),
      10,
    );
    this.refreshExpiresIn = parseInt(
      this.configService.get('REFRESH_EXPIRES_IN', '604800'),
      10,
    );
    this.inactivityTimeout = parseInt(
      this.configService.get('INACTIVITY_TIMEOUT', '1800'),
      10,
    );
  }

  async register(
    registerDto: RegisterDto,
    ip?: string,
    userAgent?: string,
  ): Promise<TokenResponse> {
    // Verifica se o email já existe
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('Este e-mail já está cadastrado');
    }

    // Cria o hash da senha
    const passwordHash = await bcrypt.hash(registerDto.password, SALT_ROUNDS);

    // Cria o usuário com role padrão OPERATOR
    const user = await this.prisma.client.user.create({
      data: {
        name: registerDto.name,
        email: registerDto.email,
        passwordHash,
        role: 'ADMIN', // Novos usuários sempre começam como ADMIN
        active: true,
      },
    });

    // Gera tokens e cria sessão
    const tokens = await this.generateTokens(user.id, user.email, user.role);
    const refreshTokenHash = this.hashToken(tokens.refreshToken);
    await this.usersService.updateRefreshToken(user.id, refreshTokenHash);
    await this.createSession(user.id, tokens.accessToken, ip, userAgent);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async login(
    loginDto: LoginDto,
    ip?: string,
    userAgent?: string,
  ): Promise<TokenResponse> {
    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    if (!user.active) {
      throw new ForbiddenException('Usuário desativado');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMinutes = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / 60000,
      );
      throw new ForbiddenException(
        `Conta bloqueada. Tente novamente em ${remainingMinutes} minutos.`,
      );
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      await this.usersService.incrementFailedAttempts(user.id);
      throw new UnauthorizedException('Credenciais inválidas');
    }

    await this.usersService.updateLastLogin(user.id);

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    const refreshTokenHash = this.hashToken(tokens.refreshToken);
    await this.usersService.updateRefreshToken(user.id, refreshTokenHash);

    await this.createSession(user.id, tokens.accessToken, ip, userAgent);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async refreshTokens(refreshToken: string): Promise<TokenResponse> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      const user = await this.prisma.client.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.active || !user.refreshToken) {
        throw new UnauthorizedException('Refresh token inválido');
      }

      const isTokenValid = this.verifyToken(refreshToken, user.refreshToken);

      if (!isTokenValid) {
        throw new UnauthorizedException('Refresh token inválido');
      }

      if (user.refreshTokenExp && user.refreshTokenExp < new Date()) {
        throw new UnauthorizedException('Refresh token expirado');
      }

      const tokens = await this.generateTokens(user.id, user.email, user.role);

      const refreshTokenHash = this.hashToken(tokens.refreshToken);
      await this.usersService.updateRefreshToken(user.id, refreshTokenHash);

      return {
        ...tokens,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      };
    } catch {
      throw new UnauthorizedException('Refresh token inválido');
    }
  }

  async logout(userId: number, token: string) {
    await this.prisma.client.userSession.deleteMany({
      where: { userId, token },
    });

    await this.usersService.updateRefreshToken(userId, null);

    return { message: 'Logout realizado com sucesso' };
  }

  async logoutAll(userId: number) {
    await this.prisma.client.userSession.deleteMany({
      where: { userId },
    });

    await this.usersService.updateRefreshToken(userId, null);

    return { message: 'Logout de todas as sessões realizado com sucesso' };
  }

  async changePassword(userId: number, changePasswordDto: ChangePasswordDto) {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    const isPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Senha atual incorreta');
    }

    const newPasswordHash = await bcrypt.hash(
      changePasswordDto.newPassword,
      SALT_ROUNDS,
    );

    await this.prisma.client.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    await this.logoutAll(userId);

    return { message: 'Senha alterada com sucesso' };
  }

  async validateUser(payload: JwtPayload): Promise<AuthenticatedUser | null> {
    const user = await this.prisma.client.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        lastActivity: true,
      },
    });

    if (!user || !user.active) {
      return null;
    }

    if (user.lastActivity) {
      const inactiveTime = Date.now() - user.lastActivity.getTime();
      if (inactiveTime > this.inactivityTimeout * 1000) {
        return null;
      }
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }

  async updateActivity(userId: number) {
    await this.usersService.updateLastActivity(userId);
  }

  async getSessions(userId: number) {
    return this.prisma.client.userSession.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        ip: true,
        userAgent: true,
        createdAt: true,
        lastActivity: true,
      },
      orderBy: { lastActivity: 'desc' },
    });
  }

  async revokeSession(userId: number, sessionId: number) {
    await this.prisma.client.userSession.deleteMany({
      where: { id: sessionId, userId },
    });

    return { message: 'Sessão revogada com sucesso' };
  }

  private async generateTokens(userId: number, email: string, role: string) {
    const payload: JwtPayload = {
      sub: userId,
      email,
      role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: this.jwtExpiresIn,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.refreshExpiresIn,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.jwtExpiresIn,
    };
  }

  private async createSession(
    userId: number,
    token: string,
    ip?: string,
    userAgent?: string,
  ) {
    const expiresAt = new Date(Date.now() + this.jwtExpiresIn * 1000);

    return this.prisma.client.userSession.create({
      data: {
        userId,
        token,
        ip,
        userAgent,
        expiresAt,
      },
    });
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private verifyToken(token: string, hashedToken: string): boolean {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    return tokenHash === hashedToken;
  }
}
