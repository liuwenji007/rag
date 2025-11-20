import { IsString, IsOptional, IsNumber, IsArray, Min, Max } from 'class-validator';

export class SearchDto {
  @IsString()
  query!: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  topK?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  minScore?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  datasourceIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  contentTypes?: string[];
}

