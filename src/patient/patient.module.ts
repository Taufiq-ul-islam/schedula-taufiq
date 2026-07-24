import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PatientService } from './patient.service';
import { PatientController } from './patient.controller';
import { Patient } from './patient.entity';
import { User } from '../user/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Patient, User])],
  providers: [PatientService],
  controllers: [PatientController],
  exports: [TypeOrmModule],
})
export class PatientModule {}
