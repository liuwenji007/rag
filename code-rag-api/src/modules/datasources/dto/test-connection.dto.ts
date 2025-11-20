import { IsString, IsEnum, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import type { DataSourceType } from '../interfaces/datasource-config.interface';

class FeishuConfigDto {
  @IsString()
  appId!: string;

  @IsString()
  appSecret!: string;

  @IsString()
  spaceId!: string;
}

class GitLabConfigDto {
  @IsString()
  url!: string;

  @IsString()
  accessToken!: string;
}

class DatabaseConfigDto {
  @IsEnum(['mysql', 'postgresql', 'mongodb'])
  type!: 'mysql' | 'postgresql' | 'mongodb';

  @IsString()
  connectionString!: string;
}

export class TestConnectionDto {
  @IsEnum(['FEISHU', 'GITLAB', 'DATABASE'])
  type!: DataSourceType;

  @IsObject()
  @ValidateNested()
  @Type((opts) => {
    const obj = opts?.object as TestConnectionDto;
    if (obj.type === 'FEISHU') return FeishuConfigDto;
    if (obj.type === 'GITLAB') return GitLabConfigDto;
    if (obj.type === 'DATABASE') return DatabaseConfigDto;
    return Object;
  })
  config!: FeishuConfigDto | GitLabConfigDto | DatabaseConfigDto;
}
