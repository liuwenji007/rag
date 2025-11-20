import { Controller, Get } from '@nestjs/common';
import { MonitoringService } from '../../services/monitoring/monitoring.service';

@Controller('monitoring')
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  /**
   * 获取监控看板数据
   */
  @Get('dashboard')
  getDashboard() {
    return this.monitoringService.getDashboard();
  }
}

