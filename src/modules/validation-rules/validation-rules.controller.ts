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
  Query,
} from '@nestjs/common';
import { ValidationRulesService } from './validation-rules.service';
import { CreateValidationRuleDto, UpdateValidationRuleDto } from './dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@Controller('validation-rules')
export class ValidationRulesController {
  constructor(
    private readonly validationRulesService: ValidationRulesService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN', 'MANAGER')
  create(@Body() createValidationRuleDto: CreateValidationRuleDto) {
    return this.validationRulesService.create(createValidationRuleDto);
  }

  @Get()
  @RequirePermission({ action: 'view' })
  findAll(@Query('module') module?: string) {
    return this.validationRulesService.findAll(module);
  }

  @Get(':id')
  @RequirePermission({ action: 'view' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.validationRulesService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'MANAGER')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateValidationRuleDto: UpdateValidationRuleDto,
  ) {
    return this.validationRulesService.update(id, updateValidationRuleDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('ADMIN')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.validationRulesService.remove(id);
  }
}
