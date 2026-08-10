import { IsDateString, Matches, IsOptional } from 'class-validator';

export class RescheduleAppointmentDto {
  @IsDateString()
  date!: string;

  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'startTime must be HH:mm' })
  startTime!: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'endTime must be HH:mm' })
  endTime?: string; // required for WAVE, ignored for STREAM (same rule as booking)
}
