import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateUnitDto, UpdateUnitDto } from './dto';

@Injectable()
export class UnitsService {
  constructor(private prisma: PrismaService) {}

  async create(createUnitDto: CreateUnitDto) {
    return this.prisma.client.unit.create({
      data: createUnitDto,
    });
  }

  async findAll() {
    return this.prisma.client.unit.findMany({
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
