import { Module } from '@nestjs/common';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';
import { CacheModule } from '../../services/cache/cache.module';
import { AuditLogModule } from '../audit-logs/audit-log.module';

@Module({
  imports: [CacheModule, AuditLogModule],
  controllers: [PermissionsController],
  providers: [PermissionsService],
  exports: [PermissionsService],
})
export class PermissionsModule {}

