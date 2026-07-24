import { IsEnum, IsInt, Min, IsOptional, ValidateIf } from 'class-validator';
import { SchedulingType } from '../enums/scheduling-type.enum';

export class UpdateSchedulingConfigDto {
  @IsEnum(SchedulingType)
  schedulingType!: SchedulingType;

  @ValidateIf((o) => o.schedulingType === SchedulingType.STREAM)
  @IsInt()
  @Min(1)
  slotDurationMinutes?: number;

  @ValidateIf((o) => o.schedulingType === SchedulingType.STREAM)
  @IsOptional()
  @IsInt()
  @Min(0)
  bufferMinutes?: number;

  @ValidateIf((o) => o.schedulingType === SchedulingType.WAVE)
  @IsInt()
  @Min(1)
  maxCapacityPerWindow?: number;
}
