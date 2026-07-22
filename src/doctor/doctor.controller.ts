import { Controller, Get, Post, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../user/user.entity';
import { DoctorService } from './doctor.service';
import { CreateDoctorProfileDto } from './dto/create-doctor-profile.dto';
import { UpdateDoctorProfileDto } from './dto/update-doctor-profile.dto';

@Controller('doctor')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.DOCTOR)
export class DoctorController {
  constructor(private doctorService: DoctorService) {}

  @Post('profile')
  createProfile(@Request() req: any, @Body() dto: CreateDoctorProfileDto) {
    return this.doctorService.createProfile(req.user.userId, dto);
  }

  @Get('profile')
  getProfile(@Request() req: any) {
    return this.doctorService.getProfile(req.user.userId);
  }

  @Patch('profile')
  updateProfile(@Request() req: any, @Body() dto: UpdateDoctorProfileDto) {
    return this.doctorService.updateProfile(req.user.userId, dto);
  }
}
