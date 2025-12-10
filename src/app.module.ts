import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './shared/prisma/prisma.module';
import { LoggingInterceptor } from './shared/interceptors/logging.interceptor';
import { HttpExceptionFilter } from './shared/filters/http-exception.filter';
import { UnitsModule } from './modules/units/units.module';
import { ValidationRulesModule } from './modules/validation-rules/validation-rules.module';
import { RawDataModule } from './modules/raw-data/raw-data.module';
import { ValidationsModule } from './modules/validations/validations.module';
import { TransformModule } from './modules/transform/transform.module';
import { RemittancesModule } from './modules/remittances/remittances.module';
import { TceIntegrationModule } from './modules/tce-integration/tce-integration.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuditInterceptor } from './shared/interceptors/audit.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    UnitsModule,
    ValidationRulesModule,
    RawDataModule,
    ValidationsModule,
    TransformModule,
    RemittancesModule,
    TceIntegrationModule,
    AuditModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
