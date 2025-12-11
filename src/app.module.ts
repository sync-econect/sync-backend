import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR, APP_FILTER, APP_GUARD } from '@nestjs/core';
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
import { EndpointConfigsModule } from './modules/endpoint-configs/endpoint-configs.module';
import { AuditInterceptor } from './shared/interceptors/audit.interceptor';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from './modules/auth/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    UnitsModule,
    ValidationRulesModule,
    RawDataModule,
    ValidationsModule,
    TransformModule,
    RemittancesModule,
    TceIntegrationModule,
    AuditModule,
    EndpointConfigsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
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
