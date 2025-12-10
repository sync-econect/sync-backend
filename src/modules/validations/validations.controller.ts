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

@Controller('validations')
export class ValidationsController {
  constructor(private readonly validationsService: ValidationsService) {}

  @Post('raw-data/:rawDataId/validate')
  async validateRawData(
    @Param('rawDataId', ParseIntPipe) rawDataId: number,
  ): Promise<ValidationResult> {
    return this.validationsService.validateRawData(rawDataId);
  }

  @Post('raw-data/:rawDataId/revalidate')
  async revalidateRawData(
    @Param('rawDataId', ParseIntPipe) rawDataId: number,
  ): Promise<ValidationResult> {
    return this.validationsService.revalidate(rawDataId);
  }

  @Get('raw-data/:rawDataId')
  async getByRawData(
    @Param('rawDataId', ParseIntPipe) rawDataId: number,
  ): Promise<Validation[]> {
    return this.validationsService.getValidationsByRawData(rawDataId);
  }

  @Delete('raw-data/:rawDataId')
  async clearValidations(
    @Param('rawDataId', ParseIntPipe) rawDataId: number,
  ): Promise<{ count: number }> {
    return this.validationsService.clearValidations(rawDataId);
  }

  @Get()
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
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Validation> {
    return this.validationsService.findOne(id);
  }
}
