import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto';

const SALT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const existingUser = await this.prisma.client.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email já cadastrado');
    }

    const passwordHash = await bcrypt.hash(createUserDto.password, SALT_ROUNDS);

    const user = await this.prisma.client.user.create({
      data: {
        email: createUserDto.email,
        name: createUserDto.name,
        passwordHash,
        role: createUserDto.role ?? 'OPERATOR',
        active: createUserDto.active ?? true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  async findAll() {
    return this.prisma.client.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        lastLogin: true,
        lastActivity: true,
        failedLoginAttempts: true,
        lockedUntil: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const user = await this.prisma.client.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        lastLogin: true,
        lastActivity: true,
        failedLoginAttempts: true,
        lockedUntil: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.client.user.findUnique({
      where: { email },
    });
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    await this.findOne(id);

    const data: Record<string, unknown> = {};

    if (updateUserDto.email) {
      const existingUser = await this.prisma.client.user.findFirst({
        where: {
          email: updateUserDto.email,
          NOT: { id },
        },
      });

      if (existingUser) {
        throw new ConflictException('Email já cadastrado');
      }
      data.email = updateUserDto.email;
    }

    if (updateUserDto.name) data.name = updateUserDto.name;
    if (updateUserDto.role) data.role = updateUserDto.role;
    if (typeof updateUserDto.active === 'boolean')
      data.active = updateUserDto.active;

    if (updateUserDto.password) {
      data.passwordHash = await bcrypt.hash(
        updateUserDto.password,
        SALT_ROUNDS,
      );
    }

    return this.prisma.client.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        lastLogin: true,
        lastActivity: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    await this.prisma.client.user.delete({
      where: { id },
    });

    return { message: 'Usuário removido com sucesso' };
  }

  async updateLastLogin(id: number) {
    return this.prisma.client.user.update({
      where: { id },
      data: {
        lastLogin: new Date(),
        lastActivity: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
  }

  async updateLastActivity(id: number) {
    return this.prisma.client.user.update({
      where: { id },
      data: {
        lastActivity: new Date(),
      },
    });
  }

  async incrementFailedAttempts(id: number) {
    const user = await this.prisma.client.user.findUnique({
      where: { id },
      select: { failedLoginAttempts: true },
    });

    if (!user) return;

    const failedAttempts = user.failedLoginAttempts + 1;

    const lockedUntil =
      failedAttempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;

    return this.prisma.client.user.update({
      where: { id },
      data: {
        failedLoginAttempts: failedAttempts,
        lockedUntil,
      },
    });
  }

  async updateRefreshToken(id: number, refreshToken: string | null) {
    const refreshTokenExp = refreshToken
      ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      : null;

    return this.prisma.client.user.update({
      where: { id },
      data: {
        refreshToken,
        refreshTokenExp,
      },
    });
  }

  async unlockUser(id: number) {
    await this.findOne(id);

    return this.prisma.client.user.update({
      where: { id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        active: true,
        lockedUntil: true,
      },
    });
  }
}
