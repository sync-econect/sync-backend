import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { AuditService } from './audit.service';
import { CreateAuditLogDto } from './dto';
import { AuditLog } from '../../../generated/prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Post()
  @Roles('ADMIN', 'MANAGER')
  async create(
    @Body() createAuditLogDto: CreateAuditLogDto,
  ): Promise<AuditLog> {
    return this.auditService.logAction(createAuditLogDto);
  }

  @Get()
  @Roles('ADMIN', 'MANAGER')
  async findAll(
    @Query('entity') entity?: string,
    @Query('entityId') entityId?: string,
    @Query('action') action?: string,
    @Query('userId') userId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<{ data: AuditLog[]; total: number; page: number; limit: number }> {
    return this.auditService.findAll({
      entity,
      entityId: entityId ? parseInt(entityId, 10) : undefined,
      action,
      userId: userId ? parseInt(userId, 10) : undefined,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':id')
  @Roles('ADMIN', 'MANAGER')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<AuditLog> {
    return this.auditService.findOne(id);
  }
}
