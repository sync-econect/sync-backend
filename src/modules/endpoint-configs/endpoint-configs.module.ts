import { Module } from '@nestjs/common';
import { EndpointConfigsService } from './endpoint-configs.service';
import { EndpointConfigsController } from './endpoint-configs.controller';

@Module({
  controllers: [EndpointConfigsController],
  providers: [EndpointConfigsService],
  exports: [EndpointConfigsService],
})
export class EndpointConfigsModule {}

