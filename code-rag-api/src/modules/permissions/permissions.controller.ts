import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PermissionsService } from './permissions.service';
import { AuditLogService, ActionType, ResourceType } from '../audit-logs/audit-log.service';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';
import { UpdateUserRolesDto } from './dto/update-user-roles.dto';
import { BatchOperationDto } from './dto/batch-operation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('权限管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('permissions')
export class PermissionsController {
  constructor(
    private readonly permissionsService: PermissionsService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get('matrix')
  @ApiOperation({ summary: '获取权限矩阵' })
  async getPermissionMatrix() {
    return this.permissionsService.getPermissionMatrix();
  }

  @Put('roles/:roleId')
  @ApiOperation({ summary: '更新角色权限' })
  async updateRolePermissions(
    @Param('roleId') roleId: string,
    @Body() dto: UpdateRolePermissionsDto,
    @Request() req: any,
  ) {
    const userId = req.user?.id || req.user?.sub;
    const result = await this.permissionsService.updateRolePermissions(
      roleId,
      dto.permissionIds,
      userId,
    );

    // 记录审计日志
    if (userId) {
      this.auditLogService.createAuditLog({
        userId,
        actionType: ActionType.PERMISSION_CHANGE,
        resourceType: ResourceType.ROLE,
        resourceId: roleId,
        details: {
          permissionIds: dto.permissionIds,
        },
        ipAddress: req?.ip || req?.socket?.remoteAddress || undefined,
        userAgent: req?.headers['user-agent'] || undefined,
      }).catch((error: unknown) => {
        console.error('Failed to record audit log:', error);
      });
    }

    return result;
  }

  @Get('users')
  @ApiOperation({ summary: '获取用户列表（带角色）' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  async getUsersWithRoles(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.permissionsService.getUsersWithRoles(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      search,
    );
  }

  @Put('users/:userId/roles')
  @ApiOperation({ summary: '更新用户角色' })
  async updateUserRoles(
    @Param('userId') userId: string,
    @Body() dto: UpdateUserRolesDto,
    @Request() req: any,
  ) {
    const changedBy = req.user?.id || req.user?.sub;
    return this.permissionsService.updateUserRoles(
      userId,
      dto.roleIds,
      changedBy,
    );
  }

  @Post('batch')
  @ApiOperation({ summary: '批量操作' })
  async batchOperation(
    @Body() dto: BatchOperationDto,
    @Request() req: any,
  ) {
    const changedBy = req.user?.id || req.user?.sub;
    return this.permissionsService.batchOperation(
      dto.operation,
      dto.targetIds,
      dto.data,
      changedBy,
    );
  }

  @Get('changelog')
  @ApiOperation({ summary: '获取权限变更日志' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'targetType', required: false, type: String })
  @ApiQuery({ name: 'targetId', required: false, type: String })
  async getPermissionChangeLog(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('targetType') targetType?: string,
    @Query('targetId') targetId?: string,
  ) {
    return this.permissionsService.getPermissionChangeLog(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      targetType,
      targetId,
    );
  }
}

