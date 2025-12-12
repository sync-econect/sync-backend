import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { EndpointConfigsService } from './endpoint-configs.service';
import { CreateEndpointConfigDto, UpdateEndpointConfigDto } from './dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@Controller('endpoint-configs')
export class EndpointConfigsController {
  constructor(
    private readonly endpointConfigsService: EndpointConfigsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN', 'MANAGER')
  create(@Body() createEndpointConfigDto: CreateEndpointConfigDto) {
    return this.endpointConfigsService.create(createEndpointConfigDto);
  }

  @Get()
  @RequirePermission({ action: 'view' })
  findAll() {
    return this.endpointConfigsService.findAll();
  }

  @Get(':id')
  @RequirePermission({ action: 'view' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.endpointConfigsService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'MANAGER')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEndpointConfigDto: UpdateEndpointConfigDto,
  ) {
    return this.endpointConfigsService.update(id, updateEndpointConfigDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('ADMIN')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.endpointConfigsService.remove(id);
  }
}
