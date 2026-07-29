import { Controller, Post, Get, Patch, Body, Param, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../user/user.entity';
import { AppointmentService } from './appointment.service';
import { SchedulingService } from './scheduling.service';
import { BookAppointmentDto } from './dto/book-appointment.dto';

@Controller('appointment')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AppointmentController {
  constructor(
    private appointmentService: AppointmentService,
    private schedulingService: SchedulingService,
  ) {}

  @Post()
  @Roles(UserRole.PATIENT)
  book(@Request() req: any, @Body() dto: BookAppointmentDto) {
    return this.schedulingService.bookAppointment(req.user.userId, dto);
  }

  @Get('my')
  @Roles(UserRole.PATIENT)
  getMy(@Request() req: any) {
    return this.appointmentService.getMyAppointments(req.user.userId);
  }

  @Patch(':id/cancel')
  @Roles(UserRole.PATIENT)
  cancel(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.appointmentService.cancelAppointment(req.user.userId, id);
  }
}
