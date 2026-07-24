import { IsDateString, Matches } from 'class-validator';

export class BookWaveAppointmentDto {
  @IsDateString()
  date!: string;

  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'windowStartTime must be in HH:mm format' })
  windowStartTime!: string;

  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'windowEndTime must be in HH:mm format' })
  windowEndTime!: string;
}
