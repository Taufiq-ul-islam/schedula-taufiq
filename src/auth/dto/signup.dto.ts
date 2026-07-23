import { IsString, IsNotEmpty, IsEnum, MinLength } from 'class-validator';
import { UserRole } from '../../user/user.entity';

export class SignupDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
  
  @IsString()
  @IsNotEmpty()
  mobileNumber!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsEnum(UserRole)
  role!: UserRole;
}
