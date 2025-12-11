import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { EndpointConfig } from '../../../generated/prisma/client';
import { CreateEndpointConfigDto, UpdateEndpointConfigDto } from './dto';

@Injectable()
export class EndpointConfigsService {
  constructor(private prisma: PrismaService) {}

  async create(
    createEndpointConfigDto: CreateEndpointConfigDto,
  ): Promise<EndpointConfig> {
    const existing = await this.prisma.client.endpointConfig.findUnique({
      where: { module: createEndpointConfigDto.module },
    });

    if (existing) {
      throw new ConflictException(
        `Já existe um endpoint configurado para o módulo ${createEndpointConfigDto.module}`,
      );
    }

    return this.prisma.client.endpointConfig.create({
      data: {
        module: createEndpointConfigDto.module,
        endpoint: createEndpointConfigDto.endpoint,
        method: createEndpointConfigDto.method ?? 'POST',
        description: createEndpointConfigDto.description,
        active: createEndpointConfigDto.active ?? true,
      },
    });
  }

  async findAll(): Promise<EndpointConfig[]> {
    return this.prisma.client.endpointConfig.findMany({
      orderBy: { module: 'asc' },
    });
  }

  async findOne(id: number): Promise<EndpointConfig> {
    const endpointConfig = await this.prisma.client.endpointConfig.findUnique({
      where: { id },
    });

    if (!endpointConfig) {
      throw new NotFoundException(
        `EndpointConfig com ID ${id} não encontrado`,
      );
    }

    return endpointConfig;
  }

  async findByModule(module: string): Promise<EndpointConfig | null> {
    return this.prisma.client.endpointConfig.findUnique({
      where: { module },
    });
  }

  async update(
    id: number,
    updateEndpointConfigDto: UpdateEndpointConfigDto,
  ): Promise<EndpointConfig> {
    const existing = await this.prisma.client.endpointConfig.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(
        `EndpointConfig com ID ${id} não encontrado`,
      );
    }

    // Verifica se está tentando mudar para um módulo que já existe
    if (
      updateEndpointConfigDto.module &&
      updateEndpointConfigDto.module !== existing.module
    ) {
      const conflicting = await this.prisma.client.endpointConfig.findUnique({
        where: { module: updateEndpointConfigDto.module },
      });

      if (conflicting) {
        throw new ConflictException(
          `Já existe um endpoint configurado para o módulo ${updateEndpointConfigDto.module}`,
        );
      }
    }

    return this.prisma.client.endpointConfig.update({
      where: { id },
      data: updateEndpointConfigDto,
    });
  }

  async remove(id: number): Promise<void> {
    const existing = await this.prisma.client.endpointConfig.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(
        `EndpointConfig com ID ${id} não encontrado`,
      );
    }

    await this.prisma.client.endpointConfig.delete({
      where: { id },
    });
  }
}

