import { Module } from '@nestjs/common';
import { UIRequirementsController } from './ui-requirements.controller';
import { UIRequirementsService } from './ui-requirements.service';
import { PrismaService } from '../../database/prisma.service';
import { LLMModule } from '../../services/llm/llm.module';

@Module({
  imports: [LLMModule],
  controllers: [UIRequirementsController],
  providers: [UIRequirementsService, PrismaService],
  exports: [UIRequirementsService],
})
export class UIRequirementsModule {}

