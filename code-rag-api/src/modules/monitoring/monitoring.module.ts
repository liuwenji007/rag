import { Module } from '@nestjs/common';
import { MonitoringController } from './monitoring.controller';
import { MonitoringModule as MonitoringServiceModule } from '../../services/monitoring/monitoring.module';

@Module({
  imports: [MonitoringServiceModule],
  controllers: [MonitoringController],
})
export class MonitoringModule {}

