import { PartialType } from '@nestjs/mapped-types';
import { CreateEndpointConfigDto } from './create-endpoint-config.dto';

export class UpdateEndpointConfigDto extends PartialType(
  CreateEndpointConfigDto,
) {}
