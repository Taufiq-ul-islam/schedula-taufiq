import { IsInt, IsDateString, Matches } from 'class-validator';

export class BookAppointmentDto {
  @IsInt()
  doctorId!: number;

  @IsDateString()
  date!: string;

  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'startTime must be HH:mm' })
  startTime!: string;

  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'endTime must be HH:mm' })
  endTime!: string;
}
