import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { RawDataService } from './raw-data.service';
import { CreateRawDataDto, UpdateRawDataDto } from './dto';
import { RawData } from '../../../generated/prisma/client';

@Controller('raw-data')
export class RawDataController {
  constructor(private readonly rawDataService: RawDataService) {}

  @Post()
  async create(@Body() createRawDataDto: CreateRawDataDto): Promise<RawData> {
    return this.rawDataService.create(createRawDataDto);
  }

  @Get()
  async findAll(
    @Query('unitId') unitId?: string,
    @Query('module') module?: string,
    @Query('status') status?: string,
    @Query('competency') competency?: string,
  ): Promise<RawData[]> {
    return this.rawDataService.findAll({
      unitId: unitId ? parseInt(unitId, 10) : undefined,
      module,
      status,
      competency,
    });
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<RawData> {
    return this.rawDataService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRawDataDto: UpdateRawDataDto,
  ): Promise<RawData> {
    return this.rawDataService.update(id, updateRawDataDto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number): Promise<RawData> {
    return this.rawDataService.remove(id);
  }

  @Get('module/:module')
  async findByModule(@Param('module') module: string): Promise<RawData[]> {
    return this.rawDataService.findByModule(module);
  }
}
