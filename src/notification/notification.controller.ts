import { Controller, Get, Patch, Param, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../user/user.entity';
import { NotificationService } from './notification.service';

@Controller('notification')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  @Get('my')
  @Roles(UserRole.PATIENT)
  getMy(@Request() req: any) {
    return this.notificationService.getMyNotifications(req.user.userId);
  }

  @Patch(':id/read')
  @Roles(UserRole.PATIENT)
  markAsRead(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.notificationService.markAsRead(req.user.userId, id);
  }
}
