import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Doctor } from './doctor.entity';
import { SchedulingType } from './enums/scheduling-type.enum';
import { UpdateSchedulingConfigDto } from './dto/update-scheduling-config.dto';

@Injectable()
export class SchedulingConfigService {
  constructor(@InjectRepository(Doctor) private doctorRepo: Repository<Doctor>) {}

  async updateConfig(userId: number, dto: UpdateSchedulingConfigDto) {
    const doctor = await this.doctorRepo.findOne({ where: { user: { id: userId } } });
    if (!doctor) throw new NotFoundException('Doctor profile not found');

    if (dto.schedulingType === SchedulingType.STREAM && (!dto.slotDurationMinutes || dto.slotDurationMinutes <= 0)) {
      throw new BadRequestException('slotDurationMinutes must be a positive number for STREAM scheduling');
    }
    if (dto.schedulingType === SchedulingType.WAVE && (!dto.maxCapacityPerWindow || dto.maxCapacityPerWindow <= 0)) {
      throw new BadRequestException('maxCapacityPerWindow must be a positive number for WAVE scheduling');
    }

    doctor.schedulingType = dto.schedulingType;
    doctor.slotDurationMinutes = dto.slotDurationMinutes ?? doctor.slotDurationMinutes;
    doctor.bufferMinutes = dto.bufferMinutes ?? 0;
    doctor.maxCapacityPerWindow = dto.maxCapacityPerWindow ?? doctor.maxCapacityPerWindow;

    return this.doctorRepo.save(doctor);
  }

  async getConfig(userId: number) {
    const doctor = await this.doctorRepo.findOne({ where: { user: { id: userId } } });
    if (!doctor) throw new NotFoundException('Doctor profile not found');
    return {
      schedulingType: doctor.schedulingType,
      slotDurationMinutes: doctor.slotDurationMinutes,
      bufferMinutes: doctor.bufferMinutes,
      maxCapacityPerWindow: doctor.maxCapacityPerWindow,
    };
  }
}
