import { Controller, Get, Post, Param, Query, Body, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../user/user.entity';
import { SchedulingService } from './scheduling.service';
import { BookStreamAppointmentDto } from './dto/book-stream-appointment.dto';
import { BookWaveAppointmentDto } from './dto/book-wave-appointment.dto';

@Controller('doctor/:doctorId')
export class SchedulingController {
  constructor(private schedulingService: SchedulingService) {}

  @Get('slots')
  getSlots(@Param('doctorId', ParseIntPipe) doctorId: number, @Query('date') date: string) {
    return this.schedulingService.getAvailableSlots(doctorId, date);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PATIENT)
  @Post('book/stream')
  bookStream(
    @Request() req: any,
    @Param('doctorId', ParseIntPipe) doctorId: number,
    @Body() dto: BookStreamAppointmentDto,
  ) {
    return this.schedulingService.bookStream(req.user.userId, doctorId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PATIENT)
  @Post('book/wave')
  bookWave(
    @Request() req: any,
    @Param('doctorId', ParseIntPipe) doctorId: number,
    @Body() dto: BookWaveAppointmentDto,
  ) {
    return this.schedulingService.bookWave(req.user.userId, doctorId, dto);
  }
}
