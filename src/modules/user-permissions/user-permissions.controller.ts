import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { UserPermissionsService } from './user-permissions.service';
import { CreateUserPermissionDto, UpdateUserPermissionDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('user-permissions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserPermissionsController {
  constructor(
    private readonly userPermissionsService: UserPermissionsService,
  ) {}

  @Post()
  @Roles('ADMIN')
  create(@Body() createDto: CreateUserPermissionDto) {
    return this.userPermissionsService.create(createDto);
  }

  @Post('bulk/:userId')
  @Roles('ADMIN')
  createBulk(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() permissions: Omit<CreateUserPermissionDto, 'userId'>[],
  ) {
    return this.userPermissionsService.createBulk(userId, permissions);
  }

  @Get()
  @Roles('ADMIN', 'MANAGER')
  findAll(
    @Query('userId') userId?: string,
    @Query('unitId') unitId?: string,
    @Query('module') module?: string,
  ) {
    return this.userPermissionsService.findAll({
      userId: userId ? parseInt(userId, 10) : undefined,
      unitId: unitId ? parseInt(unitId, 10) : undefined,
      module,
    });
  }

  @Get('user/:userId')
  @Roles('ADMIN', 'MANAGER')
  findByUser(@Param('userId', ParseIntPipe) userId: number) {
    return this.userPermissionsService.findByUser(userId);
  }

  @Get('check')
  @Roles('ADMIN', 'MANAGER')
  async checkPermission(
    @Query('userId', ParseIntPipe) userId: number,
    @Query('action') action: 'view' | 'create' | 'edit' | 'delete' | 'transmit',
    @Query('unitId') unitId?: string,
    @Query('module') module?: string,
  ) {
    const hasPermission = await this.userPermissionsService.checkPermission({
      userId,
      unitId: unitId ? parseInt(unitId, 10) : undefined,
      module: module || undefined,
      action,
    });
    return { hasPermission };
  }

  @Get('permitted-units/:userId')
  @Roles('ADMIN', 'MANAGER')
  async getPermittedUnits(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('action') action: 'view' | 'create' | 'edit' | 'delete' | 'transmit',
  ) {
    const units = await this.userPermissionsService.getPermittedUnits(
      userId,
      action,
    );
    return { units };
  }

  @Get('permitted-modules/:userId')
  @Roles('ADMIN', 'MANAGER')
  async getPermittedModules(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('action') action: 'view' | 'create' | 'edit' | 'delete' | 'transmit',
    @Query('unitId') unitId?: string,
  ) {
    const modules = await this.userPermissionsService.getPermittedModules(
      userId,
      action,
      unitId ? parseInt(unitId, 10) : undefined,
    );
    return { modules };
  }

  @Get(':id')
  @Roles('ADMIN', 'MANAGER')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.userPermissionsService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateUserPermissionDto,
  ) {
    return this.userPermissionsService.update(id, updateDto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.userPermissionsService.remove(id);
  }

  @Delete('user/:userId')
  @Roles('ADMIN')
  removeAllByUser(@Param('userId', ParseIntPipe) userId: number) {
    return this.userPermissionsService.removeAllByUser(userId);
  }
}

