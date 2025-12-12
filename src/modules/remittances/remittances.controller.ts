import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import {
  RemittancesService,
  RemittanceStats,
  RemittanceFilters,
} from './remittances.service';
import {
  TceIntegrationService,
  SendResult,
} from '../tce-integration/tce-integration.service';
import { CreateRemittanceDto } from './dto';
import { Remittance, RemittanceLog } from '../../../generated/prisma/client';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.service';

@Controller('remittances')
export class RemittancesController {
  constructor(
    private readonly remittancesService: RemittancesService,
    private readonly tceIntegrationService: TceIntegrationService,
  ) {}

  @Post()
  @RequirePermission({ action: 'create' })
  async create(
    @Body() createRemittanceDto: CreateRemittanceDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Remittance> {
    return this.remittancesService.create(createRemittanceDto, user.id);
  }

  @Get('stats')
  @RequirePermission({ action: 'view' })
  async getStats(): Promise<RemittanceStats> {
    return this.remittancesService.getStats();
  }

  @Get()
  @RequirePermission({ action: 'view' })
  async findAll(
    @Query('status') status?: string,
    @Query('module') module?: string,
    @Query('competency') competency?: string,
    @Query('unitId') unitId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<{
    data: Remittance[];
    total: number;
    page: number;
    limit: number;
  }> {
    const filters: RemittanceFilters = {
      status,
      module,
      competency,
      unitId: unitId ? parseInt(unitId, 10) : undefined,
      from,
      to,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    };
    return this.remittancesService.findAll(filters, user?.id);
  }

  @Get(':id')
  @RequirePermission({ action: 'view' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Remittance> {
    return this.remittancesService.findOne(id);
  }

  @Get(':id/logs')
  @RequirePermission({ action: 'view' })
  async getLogs(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<RemittanceLog[]> {
    return this.remittancesService.getLogs(id);
  }

  @Post(':id/send')
  @RequirePermission({ action: 'transmit' })
  async send(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SendResult> {
    return this.tceIntegrationService.sendRemittance(id, user.id);
  }

  @Post(':id/cancel')
  @RequirePermission({ action: 'delete' })
  async cancel(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Remittance> {
    return this.remittancesService.cancel(id, user.id);
  }

  @Post(':id/retry')
  @RequirePermission({ action: 'transmit' })
  async retry(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Remittance> {
    return this.remittancesService.retry(id, user.id);
  }
}
