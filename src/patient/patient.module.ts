import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PatientService } from './patient.service';
import { PatientController } from './patient.controller';
import { Patient } from './patient.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Patient])],
  providers: [PatientService],
  controllers: [PatientController],
  exports: [TypeOrmModule],
})
export class PatientModule {}
