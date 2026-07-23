import { IsString, IsNotEmpty, IsNumber, IsOptional, IsIn, Min } from 'class-validator';

export class CreatePatientProfileDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsNumber()
  @Min(0)
  age!: number;

  @IsIn(['Male', 'MALE', 'male', 'Female', 'FEMALE', 'female', 'Other', 'OTHER', 'other'])
  @IsNotEmpty()
  gender!: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  medicalHistory?: string;
}
