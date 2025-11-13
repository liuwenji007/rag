import { Module } from '@nestjs/common';
import { DatasourcesService } from './datasources.service';
import { DatasourcesController } from './datasources.controller';
import { EncryptionModule } from '../../services/encryption/encryption.module';
import { PrismaService } from '../../database/prisma.service';

@Module({
  imports: [EncryptionModule],
  controllers: [DatasourcesController],
  providers: [DatasourcesService, PrismaService],
  exports: [DatasourcesService],
})
export class DatasourcesModule {}

