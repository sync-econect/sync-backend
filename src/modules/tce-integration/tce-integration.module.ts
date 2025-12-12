import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TceIntegrationService } from './tce-integration.service';
import { TceMockService } from './tce-mock.service';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { UserPermissionsModule } from '../user-permissions/user-permissions.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => UserPermissionsModule),
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        timeout: parseInt(
          configService.get<string>('TCE_API_TIMEOUT', '30000'),
          10,
        ),
        maxRedirects: 5,
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [TceIntegrationService, TceMockService],
  exports: [TceIntegrationService],
})
export class TceIntegrationModule {}
