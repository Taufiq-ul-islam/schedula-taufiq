import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../user/user.entity';
import { AvailabilityService } from './availability.service';
import { CreateRecurringAvailabilityDto } from './dto/create-recurring-availability.dto';
import { UpdateRecurringAvailabilityDto } from './dto/update-recurring-availability.dto';
import { CreateCustomAvailabilityDto } from './dto/create-custom-availability.dto';

@Controller('doctor/availability')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.DOCTOR)
export class AvailabilityController {
  constructor(private availabilityService: AvailabilityService) {}

  @Post()
  createRecurring(@Request() req: any, @Body() dto: CreateRecurringAvailabilityDto) {
    return this.availabilityService.createRecurring(req.user.userId, dto);
  }

  @Get()
  getRecurring(@Request() req: any) {
    return this.availabilityService.getRecurring(req.user.userId);
  }

  @Patch(':id')
  updateRecurring(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRecurringAvailabilityDto,
  ) {
    return this.availabilityService.updateRecurring(req.user.userId, id, dto);
  }

  @Delete(':id')
  deleteRecurring(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.availabilityService.deleteRecurring(req.user.userId, id);
  }

  @Post('override')
  createOverride(@Request() req: any, @Body() dto: CreateCustomAvailabilityDto) {
    return this.availabilityService.createOverride(req.user.userId, dto);
  }

  @Get('date')
  getForDate(@Request() req: any, @Query('date') date: string) {
    return this.availabilityService.getAvailabilityForDate(req.user.userId, date);
  }
}
