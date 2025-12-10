import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateRawDataDto, UpdateRawDataDto } from './dto';
import { RawData, Prisma } from '../../../generated/prisma/client';

@Injectable()
export class RawDataService {
  constructor(private prisma: PrismaService) {}

  async create(createRawDataDto: CreateRawDataDto): Promise<RawData> {
    return this.prisma.client.rawData.create({
      data: {
        unitId: createRawDataDto.unitId,
        module: createRawDataDto.module,
        competency: createRawDataDto.competency,
        payload: createRawDataDto.payload as Prisma.InputJsonValue,
        status: 'RECEIVED',
      },
      include: {
        unit: true,
      },
    });
  }

  async findAll(filters?: {
    unitId?: number;
    module?: string;
    status?: string;
    competency?: string;
  }): Promise<RawData[]> {
    return this.prisma.client.rawData.findMany({
      where: {
        ...(filters?.unitId && { unitId: filters.unitId }),
        ...(filters?.module && { module: filters.module }),
        ...(filters?.status && { status: filters.status }),
        ...(filters?.competency && { competency: filters.competency }),
      },
      include: {
        unit: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: number): Promise<RawData> {
    const rawData = await this.prisma.client.rawData.findUnique({
      where: { id },
      include: {
        unit: true,
        validations: true,
        transformedData: true,
      },
    });

    if (!rawData) {
      throw new NotFoundException(`RawData com ID ${id} não encontrado`);
    }

    return rawData;
  }

  async update(
    id: number,
    updateRawDataDto: UpdateRawDataDto,
  ): Promise<RawData> {
    await this.findOne(id);

    const updateData: Prisma.RawDataUpdateInput = {
      ...(updateRawDataDto.module && { module: updateRawDataDto.module }),
      ...(updateRawDataDto.competency && {
        competency: updateRawDataDto.competency,
      }),
      ...(updateRawDataDto.status && { status: updateRawDataDto.status }),
      ...(updateRawDataDto.payload && {
        payload: updateRawDataDto.payload as Prisma.InputJsonValue,
      }),
    };

    return this.prisma.client.rawData.update({
      where: { id },
      data: updateData,
      include: {
        unit: true,
      },
    });
  }

  async remove(id: number): Promise<RawData> {
    await this.findOne(id);

    return this.prisma.client.rawData.delete({
      where: { id },
    });
  }

  async findByModule(module: string): Promise<RawData[]> {
    return this.prisma.client.rawData.findMany({
      where: { module },
      include: {
        unit: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async updateStatus(id: number, status: string): Promise<RawData> {
    await this.findOne(id);

    return this.prisma.client.rawData.update({
      where: { id },
      data: { status },
    });
  }
}
