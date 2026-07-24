import { IsDateString, Matches } from 'class-validator';

export class BookStreamAppointmentDto {
  @IsDateString()
  date!: string;

  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'startTime must be in HH:mm format' })
  startTime!: string;
}
