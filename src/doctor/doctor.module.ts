import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DoctorService } from './doctor.service';
import { DoctorController } from './doctor.controller';
import { Doctor } from './doctor.entity';
import { Slot } from './slot.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Doctor, Slot])],
  providers: [DoctorService],
  controllers: [DoctorController],
  exports: [TypeOrmModule],
})
export class DoctorModule {}
