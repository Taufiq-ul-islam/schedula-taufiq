import { Controller, Get, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../user/user.entity';
import { SchedulingConfigService } from './scheduling-config.service';
import { UpdateSchedulingConfigDto } from './dto/update-scheduling-config.dto';

@Controller('doctor/scheduling-config')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.DOCTOR)
export class SchedulingConfigController {
  constructor(private service: SchedulingConfigService) {}

  @Patch()
  update(@Request() req: any, @Body() dto: UpdateSchedulingConfigDto) {
    return this.service.updateConfig(req.user.userId, dto);
  }

  @Get()
  get(@Request() req: any) {
    return this.service.getConfig(req.user.userId);
  }
}
