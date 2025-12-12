import { Module, forwardRef } from '@nestjs/common';
import { RemittancesService } from './remittances.service';
import { RemittancesController } from './remittances.controller';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { ValidationsModule } from '../validations/validations.module';
import { TransformModule } from '../transform/transform.module';
import { TceIntegrationModule } from '../tce-integration/tce-integration.module';
import { UserPermissionsModule } from '../user-permissions/user-permissions.module';

@Module({
  imports: [
    PrismaModule,
    ValidationsModule,
    TransformModule,
    TceIntegrationModule,
    forwardRef(() => UserPermissionsModule),
  ],
  controllers: [RemittancesController],
  providers: [RemittancesService],
  exports: [RemittancesService],
})
export class RemittancesModule {}
