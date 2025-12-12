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
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.service';

@Controller('raw-data')
export class RawDataController {
  constructor(private readonly rawDataService: RawDataService) {}

  @Post()
  @RequirePermission({ action: 'create', unitIdPath: 'body.unitId', modulePath: 'body.module' })
  async create(@Body() createRawDataDto: CreateRawDataDto): Promise<RawData> {
    return this.rawDataService.create(createRawDataDto);
  }

  @Get()
  @RequirePermission({ action: 'view' })
  async findAll(
    @Query('unitId') unitId?: string,
    @Query('module') module?: string,
    @Query('status') status?: string,
    @Query('competency') competency?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<RawData[]> {
    return this.rawDataService.findAll(
      {
        unitId: unitId ? parseInt(unitId, 10) : undefined,
        module,
        status,
        competency,
      },
      user?.id,
    );
  }

  @Get(':id')
  @RequirePermission({ action: 'view' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<RawData> {
    return this.rawDataService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission({ action: 'edit' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRawDataDto: UpdateRawDataDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RawData> {
    return this.rawDataService.update(id, updateRawDataDto, user.id);
  }

  @Delete(':id')
  @RequirePermission({ action: 'delete' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RawData> {
    return this.rawDataService.remove(id, user.id);
  }

  @Get('module/:module')
  @RequirePermission({ action: 'view' })
  async findByModule(
    @Param('module') module: string,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<RawData[]> {
    return this.rawDataService.findByModule(module, user?.id);
  }
}
