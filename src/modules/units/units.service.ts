import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { UserPermissionsService } from '../user-permissions/user-permissions.service';
import { CreateUnitDto, UpdateUnitDto } from './dto';
import { Prisma } from '../../../generated/prisma/client';

@Injectable()
export class UnitsService {
  constructor(
    private prisma: PrismaService,
    private userPermissionsService: UserPermissionsService,
  ) {}

  async create(createUnitDto: CreateUnitDto) {
    return this.prisma.client.unit.create({
      data: createUnitDto,
    });
  }

  async findAll(userId?: number) {
    // Filtra por UGs permitidas para o usuário
    let where: Prisma.UnitWhereInput = {};
    if (userId) {
      const permittedUnits =
        await this.userPermissionsService.getPermittedUnits(userId, 'view');
      if (permittedUnits !== 'all') {
        where = { id: { in: permittedUnits } };
      }
    }

    return this.prisma.client.unit.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const unit = await this.prisma.client.unit.findUnique({
      where: { id },
    });

    if (!unit) {
      throw new NotFoundException(`Unidade com ID ${id} não encontrada`);
    }

    return unit;
  }

  async update(id: number, updateUnitDto: UpdateUnitDto) {
    await this.findOne(id);

    return this.prisma.client.unit.update({
      where: { id },
      data: updateUnitDto,
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.client.unit.delete({
      where: { id },
    });
  }
}
