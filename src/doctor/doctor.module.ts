import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DoctorService } from './doctor.service';
import { DoctorController } from './doctor.controller';
import { AvailabilityService } from './availability.service';
import { AvailabilityController } from './availability.controller';
import { Doctor } from './doctor.entity';
import { Slot } from './slot.entity';
import { RecurringAvailability } from './entities/recurring-availability.entity';
import { CustomAvailability } from './entities/custom-availability.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Doctor, Slot, RecurringAvailability, CustomAvailability])],
  providers: [DoctorService, AvailabilityService],
  controllers: [DoctorController, AvailabilityController],
  exports: [TypeOrmModule],
})
export class DoctorModule {}
