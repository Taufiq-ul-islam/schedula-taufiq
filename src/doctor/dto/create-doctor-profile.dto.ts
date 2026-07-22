import { IsString, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateDoctorProfileDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  specialization!: string;

  @IsNumber()
  @Min(0)
  experienceYears!: number;

  @IsString()
  @IsNotEmpty()
  qualification!: string;

  @IsNumber()
  @Min(0)
  consultationFee!: number;

  @IsString()
  @IsOptional()
  consultationHours?: string;

  @IsString()
  @IsOptional()
  bio?: string;
}
