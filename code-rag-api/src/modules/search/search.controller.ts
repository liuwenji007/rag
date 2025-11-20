import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchDto } from './dto/search.dto';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  /**
   * 执行向量检索
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async search(@Body() searchDto: SearchDto) {
    const results = await this.searchService.search(searchDto.query, {
      topK: searchDto.topK,
      minScore: searchDto.minScore,
      datasourceIds: searchDto.datasourceIds,
      contentTypes: searchDto.contentTypes,
    });

    return {
      query: searchDto.query,
      total: results.length,
      results,
    };
  }
}

