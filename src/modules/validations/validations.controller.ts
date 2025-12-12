import {
  Controller,
  Get,
  Post,
  Param,
  Delete,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ValidationsService, ValidationResult } from './validations.service';
import { Validation } from '../../../generated/prisma/client';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@Controller('validations')
export class ValidationsController {
  constructor(private readonly validationsService: ValidationsService) {}

  @Post('raw-data/:rawDataId/validate')
  @RequirePermission({ action: 'edit' })
  async validateRawData(
    @Param('rawDataId', ParseIntPipe) rawDataId: number,
  ): Promise<ValidationResult> {
    return this.validationsService.validateRawData(rawDataId);
  }

  @Post('raw-data/:rawDataId/revalidate')
  @RequirePermission({ action: 'edit' })
  async revalidateRawData(
    @Param('rawDataId', ParseIntPipe) rawDataId: number,
  ): Promise<ValidationResult> {
    return this.validationsService.revalidate(rawDataId);
  }

  @Get('raw-data/:rawDataId')
  @RequirePermission({ action: 'view' })
  async getByRawData(
    @Param('rawDataId', ParseIntPipe) rawDataId: number,
  ): Promise<Validation[]> {
    return this.validationsService.getValidationsByRawData(rawDataId);
  }

  @Delete('raw-data/:rawDataId')
  @RequirePermission({ action: 'delete' })
  async clearValidations(
    @Param('rawDataId', ParseIntPipe) rawDataId: number,
  ): Promise<{ count: number }> {
    return this.validationsService.clearValidations(rawDataId);
  }

  @Get()
  @RequirePermission({ action: 'view' })
  async findAll(
    @Query('rawId') rawId?: string,
    @Query('level') level?: string,
    @Query('code') code?: string,
  ): Promise<Validation[]> {
    return this.validationsService.findAll({
      rawId: rawId ? parseInt(rawId, 10) : undefined,
      level,
      code,
    });
  }

  @Get(':id')
  @RequirePermission({ action: 'view' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Validation> {
    return this.validationsService.findOne(id);
  }
}
