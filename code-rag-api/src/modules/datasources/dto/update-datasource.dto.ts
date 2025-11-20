import { PartialType } from '@nestjs/mapped-types';
import { CreateDataSourceDto } from './create-datasource.dto';

export class UpdateDataSourceDto extends PartialType(CreateDataSourceDto) {}
