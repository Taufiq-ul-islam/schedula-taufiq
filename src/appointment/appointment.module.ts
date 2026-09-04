import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppointmentService } from './appointment.service';
import { AppointmentController } from './appointment.controller';
import { SchedulingService } from './scheduling.service';
import { SchedulingController } from './scheduling.controller';
import { Appointment } from './appointment.entity';
import { Doctor } from '../doctor/doctor.entity';
import { Patient } from '../patient/patient.entity';
import { DoctorModule } from '../doctor/doctor.module';
import { NotificationModule } from 'src/notification/notification.module';
import { AppointmentReminderService } from './appointment-reminder.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Appointment, Doctor, Patient]),
    NotificationModule,
    forwardRef(() => DoctorModule),
  ],
  providers: [AppointmentService, SchedulingService, AppointmentReminderService],
  controllers: [AppointmentController, SchedulingController],
  exports: [TypeOrmModule, AppointmentService],
})
export class AppointmentModule {}
