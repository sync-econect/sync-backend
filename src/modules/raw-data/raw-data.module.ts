import { Module, forwardRef } from '@nestjs/common';
import { RawDataService } from './raw-data.service';
import { RawDataController } from './raw-data.controller';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { UserPermissionsModule } from '../user-permissions/user-permissions.module';

@Module({
  imports: [PrismaModule, forwardRef(() => UserPermissionsModule)],
  controllers: [RawDataController],
  providers: [RawDataService],
  exports: [RawDataService],
})
export class RawDataModule {}
