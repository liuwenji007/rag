import { Module } from '@nestjs/common';
import { SourceLinkService } from './source-link.service';

@Module({
  providers: [SourceLinkService],
  exports: [SourceLinkService],
})
export class SourceLinkModule {}

