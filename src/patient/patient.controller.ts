import { Controller, Get, Post, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../user/user.entity';
import { PatientService } from './patient.service';
import { CreatePatientProfileDto } from './dto/create-patient-profile.dto';
import { UpdatePatientProfileDto } from './dto/update-patient-profile.dto';

@Controller('patient')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PATIENT)
export class PatientController {
  constructor(private patientService: PatientService) {}

  @Post('profile')
  createProfile(@Request() req: any, @Body() dto: CreatePatientProfileDto) {
    return this.patientService.createProfile(req.user.userId, dto);
  }

  @Get('profile')
  getProfile(@Request() req: any) {
    return this.patientService.getProfile(req.user.userId);
  }

  @Patch('profile')
  updateProfile(@Request() req: any, @Body() dto: UpdatePatientProfileDto) {
    return this.patientService.updateProfile(req.user.userId, dto);
  }
}
