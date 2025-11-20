import {
  IsString,
  IsEnum,
  IsObject,
  IsOptional,
  IsBoolean,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { DataSourceType } from '../interfaces/datasource-config.interface';

export class FeishuConfigDto {
  @IsString()
  appId!: string;

  @IsString()
  appSecret!: string;

  @IsString()
  spaceId!: string;
}

export class GitLabConfigDto {
  @IsString()
  url!: string;

  @IsString()
  accessToken!: string;

  @IsArray()
  @IsString({ each: true })
  projectIds!: string[];
}

export class DatabaseConfigDto {
  @IsEnum(['mysql', 'postgresql', 'mongodb'])
  type!: 'mysql' | 'postgresql' | 'mongodb';

  @IsString()
  connectionString!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tableNames?: string[];
}

export class CreateDataSourceDto {
  @IsString()
  name!: string;

  @IsEnum(['FEISHU', 'GITLAB', 'DATABASE'])
  type!: DataSourceType;

  @IsObject()
  @ValidateNested()
  @Type((opts) => {
    const obj = opts?.object as CreateDataSourceDto;
    if (obj.type === 'FEISHU') return FeishuConfigDto;
    if (obj.type === 'GITLAB') return GitLabConfigDto;
    if (obj.type === 'DATABASE') return DatabaseConfigDto;
    return Object;
  })
  config!: FeishuConfigDto | GitLabConfigDto | DatabaseConfigDto;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  syncSchedule?: string; // Cron 表达式，如 "0 2 * * *" 表示每天凌晨 2 点
}
