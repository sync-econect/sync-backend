import { Module, forwardRef } from '@nestjs/common';
import { UnitsController } from './units.controller';
import { UnitsService } from './units.service';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { UserPermissionsModule } from '../user-permissions/user-permissions.module';

@Module({
  imports: [PrismaModule, forwardRef(() => UserPermissionsModule)],
  controllers: [UnitsController],
  providers: [UnitsService],
  exports: [UnitsService],
})
export class UnitsModule {}
