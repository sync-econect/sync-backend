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

@Controller('endpoint-configs')
export class EndpointConfigsController {
  constructor(
    private readonly endpointConfigsService: EndpointConfigsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createEndpointConfigDto: CreateEndpointConfigDto) {
    return this.endpointConfigsService.create(createEndpointConfigDto);
  }

  @Get()
  findAll() {
    return this.endpointConfigsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.endpointConfigsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEndpointConfigDto: UpdateEndpointConfigDto,
  ) {
    return this.endpointConfigsService.update(id, updateEndpointConfigDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.endpointConfigsService.remove(id);
  }
}
