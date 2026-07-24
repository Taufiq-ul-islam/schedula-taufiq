import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DoctorService } from './doctor.service';
import { DoctorController } from './doctor.controller';
import { AvailabilityService } from './availability.service';
import { AvailabilityController } from './availability.controller';
import { Doctor } from './doctor.entity';
import { RecurringAvailability } from './entities/recurring-availability.entity';
import { CustomAvailability } from './entities/custom-availability.entity';
import { SchedulingConfigService } from './scheduling-config.service';
import { SchedulingConfigController } from './scheduling-config.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Doctor, RecurringAvailability, CustomAvailability])],
  providers: [DoctorService, AvailabilityService, SchedulingConfigService],
  controllers: [DoctorController, AvailabilityController, SchedulingConfigController],
  exports: [TypeOrmModule, AvailabilityService],
})
export class DoctorModule {}
