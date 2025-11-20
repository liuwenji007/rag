import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './health/health.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { PrismaService } from './database/prisma.service';
import { DatasourcesModule } from './modules/datasources/datasources.module';
import { SyncModule } from './modules/sync/sync.module';
import { MonitoringModule } from './modules/monitoring/monitoring.module';
import { SearchModule } from './modules/search/search.module';
import { SchedulerModule } from './services/scheduler/scheduler.module';

@Module({
  imports: [HealthModule, DatasourcesModule, SyncModule, MonitoringModule, SearchModule, SchedulerModule],
  controllers: [AppController],
  providers: [
    AppService,
    PrismaService,
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
  ],
  exports: [PrismaService],
})
export class AppModule {}
