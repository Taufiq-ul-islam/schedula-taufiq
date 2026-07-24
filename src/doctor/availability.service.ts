import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Doctor } from './doctor.entity';
import { RecurringAvailability, DayOfWeek } from './entities/recurring-availability.entity';
import { CustomAvailability } from './entities/custom-availability.entity';
import { CreateRecurringAvailabilityDto } from './dto/create-recurring-availability.dto';
import { UpdateRecurringAvailabilityDto } from './dto/update-recurring-availability.dto';
import { CreateCustomAvailabilityDto } from './dto/create-custom-availability.dto';

const DAY_INDEX: DayOfWeek[] = [
  DayOfWeek.SUNDAY,
  DayOfWeek.MONDAY,
  DayOfWeek.TUESDAY,
  DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY,
  DayOfWeek.FRIDAY,
  DayOfWeek.SATURDAY,
];

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectRepository(Doctor) private doctorRepo: Repository<Doctor>,
    @InjectRepository(RecurringAvailability) private recurringRepo: Repository<RecurringAvailability>,
    @InjectRepository(CustomAvailability) private customRepo: Repository<CustomAvailability>,
  ) {}

  private async getDoctorByUserId(userId: number): Promise<Doctor> {
    const doctor = await this.doctorRepo.findOne({ where: { user: { id: userId } } });
    if (!doctor) {
      throw new NotFoundException('Doctor profile not found');
    }
    return doctor;
  }

  private validateTimeRange(startTime: string, endTime: string) {
    if (startTime >= endTime) {
      throw new BadRequestException('endTime must be after startTime');
    }
  }

  private timesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
    return startA < endB && startB < endA;
  }

  // ---------- Recurring availability ----------

  async createRecurring(userId: number, dto: CreateRecurringAvailabilityDto) {
    this.validateTimeRange(dto.startTime, dto.endTime);
    const doctor = await this.getDoctorByUserId(userId);

    const existingForDay = await this.recurringRepo.find({
      where: { doctor: { id: doctor.id }, dayOfWeek: dto.dayOfWeek },
    });

    for (const slot of existingForDay) {
      if (slot.startTime === dto.startTime && slot.endTime === dto.endTime) {
        throw new ConflictException('This exact availability window already exists');
      }
      if (this.timesOverlap(slot.startTime, slot.endTime, dto.startTime, dto.endTime)) {
        throw new ConflictException(
          `Overlaps with existing availability ${slot.startTime}-${slot.endTime} on ${dto.dayOfWeek}`,
        );
      }
    }

    const availability = this.recurringRepo.create({ ...dto, doctor: { id: doctor.id } as any });
    return this.recurringRepo.save(availability);
  }

  async getRecurring(userId: number) {
    const doctor = await this.getDoctorByUserId(userId);
    return this.recurringRepo.find({ where: { doctor: { id: doctor.id } } });
  }

  async updateRecurring(userId: number, id: number, dto: UpdateRecurringAvailabilityDto) {
    const doctor = await this.getDoctorByUserId(userId);
    const existing = await this.recurringRepo.findOne({ where: { id, doctor: { id: doctor.id } } });
    if (!existing) {
      throw new NotFoundException('Availability entry not found');
    }

    const merged = { ...existing, ...dto };
    this.validateTimeRange(merged.startTime, merged.endTime);

    const sameDay = await this.recurringRepo.find({
      where: { doctor: { id: doctor.id }, dayOfWeek: merged.dayOfWeek },
    });
    for (const slot of sameDay) {
      if (slot.id === id) continue; // skip comparing against itself
      if (this.timesOverlap(slot.startTime, slot.endTime, merged.startTime, merged.endTime)) {
        throw new ConflictException(
          `Overlaps with existing availability ${slot.startTime}-${slot.endTime} on ${merged.dayOfWeek}`,
        );
      }
    }

    Object.assign(existing, dto);
    return this.recurringRepo.save(existing);
  }

  async deleteRecurring(userId: number, id: number) {
    const doctor = await this.getDoctorByUserId(userId);
    const existing = await this.recurringRepo.findOne({ where: { id, doctor: { id: doctor.id } } });
    if (!existing) {
      throw new NotFoundException('Availability entry not found');
    }
    await this.recurringRepo.remove(existing);
    return { message: 'Availability entry deleted' };
  }

  // ---------- Custom override availability ----------

  async createOverride(userId: number, dto: CreateCustomAvailabilityDto) {
    this.validateTimeRange(dto.startTime, dto.endTime);
    const doctor = await this.getDoctorByUserId(userId);

    const existingForDate = await this.customRepo.find({
      where: { doctor: { id: doctor.id }, date: dto.date },
    });

    for (const slot of existingForDate) {
      if (slot.startTime === dto.startTime && slot.endTime === dto.endTime) {
        throw new ConflictException('This exact override already exists for this date');
      }
      if (this.timesOverlap(slot.startTime, slot.endTime, dto.startTime, dto.endTime)) {
        throw new ConflictException(
          `Overlaps with existing override ${slot.startTime}-${slot.endTime} on ${dto.date}`,
        );
      }
    }

    const override = this.customRepo.create({ ...dto, doctor: { id: doctor.id } as any });
    return this.customRepo.save(override);
  }

  async getAvailabilityForDate(userId: number, dateStr: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      throw new BadRequestException('date must be in YYYY-MM-DD format');
    }

    const doctor = await this.getDoctorByUserId(userId);

    const overrides = await this.customRepo.find({
      where: { doctor: { id: doctor.id }, date: dateStr },
    });
    if (overrides.length > 0) {
      return { date: dateStr, source: 'override', slots: overrides };
    }

    const parsedDate = new Date(dateStr);
    if (isNaN(parsedDate.getTime())) {
      throw new BadRequestException('Invalid date provided');
    }
    const dayOfWeek = DAY_INDEX[parsedDate.getUTCDay()];

    const recurring = await this.recurringRepo.find({
      where: { doctor: { id: doctor.id }, dayOfWeek },
    });

    if (recurring.length === 0) {
      throw new NotFoundException(`Doctor is not available on ${dayOfWeek} (${dateStr})`);
    }

    return { date: dateStr, source: 'recurring', dayOfWeek, slots: recurring };
  }
}
