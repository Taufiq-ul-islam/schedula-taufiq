import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppointmentService } from './appointment.service';
import { AppointmentController } from './appointment.controller';
import { SchedulingService } from './scheduling.service';
import { SchedulingController } from './scheduling.controller';
import { Appointment } from './appointment.entity';
import { Doctor } from '../doctor/doctor.entity';
import { Patient } from '../patient/patient.entity';
import { DoctorModule } from '../doctor/doctor.module';

@Module({
  imports: [TypeOrmModule.forFeature([Appointment, Doctor, Patient]), DoctorModule],
  providers: [AppointmentService, SchedulingService],
  controllers: [AppointmentController, SchedulingController],
  exports: [TypeOrmModule],
})
export class AppointmentModule {}
