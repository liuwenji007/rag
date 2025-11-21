import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
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
import { DiffModule } from './modules/diff/diff.module';
import { SchedulerModule } from './services/scheduler/scheduler.module';

@Module({
  imports: [
    // 配置限流
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 分钟
        limit: 100, // 100 请求/分钟
      },
    ]),
    HealthModule,
    DatasourcesModule,
    SyncModule,
    MonitoringModule,
    SearchModule,
    DiffModule,
    SchedulerModule,
  ],
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
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  exports: [PrismaService],
})
export class AppModule {}
