import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiHeader,
  ApiBody,
} from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { ApproveReviewDto } from './dto/approve-review.dto';
import { RejectReviewDto } from './dto/reject-review.dto';

@ApiTags('reviews')
@Controller('reviews')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get('pending')
  @ApiOperation({
    summary: '获取待审核文档列表',
    description: '获取所有待审核的文档列表，支持分页。',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: '页码' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '每页数量' })
  @ApiHeader({ name: 'x-user-id', description: '用户 ID', required: false })
  @ApiResponse({
    status: 200,
    description: '成功获取待审核列表',
  })
  async getPendingReviews(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.reviewsService.getPendingReviews(pageNum, limitNum);
  }

  @Get(':id')
  @ApiOperation({
    summary: '获取审核详情',
    description: '根据审核 ID 获取审核详情，包括文档内容和元信息。',
  })
  @ApiParam({ name: 'id', description: '审核 ID' })
  @ApiResponse({
    status: 200,
    description: '成功获取审核详情',
  })
  @ApiResponse({ status: 404, description: '审核不存在' })
  async getReviewById(@Param('id') id: string) {
    return this.reviewsService.getReviewById(id);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '审核通过',
    description: '审核通过文档，文档将自动入库并触发索引。',
  })
  @ApiParam({ name: 'id', description: '审核 ID' })
  @ApiBody({ type: ApproveReviewDto })
  @ApiHeader({ name: 'x-user-id', description: '审核人 ID', required: true })
  @ApiResponse({
    status: 200,
    description: '审核通过成功',
  })
  @ApiResponse({ status: 404, description: '审核不存在' })
  @ApiResponse({ status: 400, description: '审核状态不正确' })
  async approveReview(
    @Param('id') id: string,
    @Body() dto: ApproveReviewDto,
    @Headers('x-user-id') reviewerId: string,
  ) {
    if (!reviewerId) {
      throw new Error('Reviewer ID is required');
    }
    return this.reviewsService.approveReview(id, dto, reviewerId);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '审核退回',
    description: '审核退回文档，需要填写退回原因。退回后将通知上传用户。',
  })
  @ApiParam({ name: 'id', description: '审核 ID' })
  @ApiBody({ type: RejectReviewDto })
  @ApiHeader({ name: 'x-user-id', description: '审核人 ID', required: true })
  @ApiResponse({
    status: 200,
    description: '审核退回成功',
  })
  @ApiResponse({ status: 404, description: '审核不存在' })
  @ApiResponse({ status: 400, description: '审核状态不正确或退回原因无效' })
  async rejectReview(
    @Param('id') id: string,
    @Body() dto: RejectReviewDto,
    @Headers('x-user-id') reviewerId: string,
  ) {
    if (!reviewerId) {
      throw new Error('Reviewer ID is required');
    }
    return this.reviewsService.rejectReview(id, dto, reviewerId);
  }

  @Get('history')
  @ApiOperation({
    summary: '获取审核历史',
    description: '获取已审核的文档历史记录，支持按状态筛选和分页。',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: '页码' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '每页数量' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['APPROVED', 'REJECTED'],
    description: '审核状态筛选',
  })
  @ApiResponse({
    status: 200,
    description: '成功获取审核历史',
  })
  async getReviewHistory(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: 'APPROVED' | 'REJECTED',
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.reviewsService.getReviewHistory(pageNum, limitNum, status);
  }
}

