import { Module } from '@nestjs/common';
import { RawDataService } from './raw-data.service';
import { RawDataController } from './raw-data.controller';
import { PrismaModule } from '../../shared/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RawDataController],
  providers: [RawDataService],
  exports: [RawDataService],
})
export class RawDataModule {}
