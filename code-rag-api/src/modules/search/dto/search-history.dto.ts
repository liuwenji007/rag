import { IsOptional, IsString, IsNumber, IsDateString, IsEnum, Min, Max } from 'class-validator';
import { UserRole } from '../types/role.types';

export class SearchHistoryQueryDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

export class UpdateAdoptionStatusDto {
  @IsEnum(['adopted', 'rejected'])
  adoptionStatus!: 'adopted' | 'rejected';

  @IsOptional()
  @IsString()
  comment?: string;
}

