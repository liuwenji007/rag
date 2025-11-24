import { Module } from '@nestjs/common';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { PrismaService } from '../../database/prisma.service';
import { DocumentIndexingModule } from '../../services/document-indexing/document-indexing.module';

@Module({
  imports: [DocumentIndexingModule],
  controllers: [ReviewsController],
  providers: [ReviewsService, PrismaService],
  exports: [ReviewsService],
})
export class ReviewsModule {}

