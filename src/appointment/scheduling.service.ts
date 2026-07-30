import { Injectable, NotFoundException, BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Doctor } from '../doctor/doctor.entity';
import { SchedulingType } from '../doctor/enums/scheduling-type.enum';
import { Patient } from '../patient/patient.entity';
import { Appointment } from './appointment.entity';
import { AvailabilityService } from '../doctor/availability.service';
import { BookStreamAppointmentDto } from './dto/book-stream-appointment.dto';
import { BookWaveAppointmentDto } from './dto/book-wave-appointment.dto';
import { BookAppointmentDto } from './dto/book-appointment.dto';
import { AppointmentStatus } from './enums/appointment-status.enum';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}
function toTimeStr(mins: number): string {
  const h = Math.floor(mins / 60).toString().padStart(2, '0');
  const m = (mins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

@Injectable()
export class SchedulingService {
  constructor(
    @InjectRepository(Doctor) private doctorRepo: Repository<Doctor>,
    @InjectRepository(Patient) private patientRepo: Repository<Patient>,
    @InjectRepository(Appointment) private appointmentRepo: Repository<Appointment>,
    private availabilityService: AvailabilityService,
  ) {}

  private isPast(date: string, time: string): boolean {
    const candidate = new Date(`${date}T${time}:00`);
    return candidate.getTime() < Date.now();
  }
  async bookAppointment(userId: number, dto: BookAppointmentDto) {
    const doctor = await this.doctorRepo.findOne({ where: { id: dto.doctorId } });
    if (!doctor) throw new NotFoundException('Doctor not found');
    if (!doctor.schedulingType) throw new BadRequestException('Doctor has not configured scheduling yet');

    if (doctor.schedulingType === SchedulingType.STREAM) {
      return this.bookStream(userId, dto.doctorId, { date: dto.date, startTime: dto.startTime });
    }
    return this.bookWave(userId, dto.doctorId, {
      date: dto.date,
      windowStartTime: dto.startTime,
      windowEndTime: dto.endTime,
    });
  }

  async getAvailableSlots(doctorId: number, date: string) {
    const doctor = await this.doctorRepo.findOne({ where: { id: doctorId } });
    if (!doctor) throw new NotFoundException('Doctor not found');
    if (!doctor.schedulingType) throw new BadRequestException('Doctor has not configured a scheduling type yet');

    const availability = await this.availabilityService.getAvailabilityForDateByDoctorId(doctorId, date);
    const windows = availability.slots as { startTime: string; endTime: string }[];

    if (doctor.schedulingType === SchedulingType.STREAM) {
      return this.generateStreamSlots(doctor, date, windows);
    }
    return this.generateWaveWindows(doctor, date, windows);
  }

  private async generateStreamSlots(doctor: Doctor, date: string, windows: { startTime: string; endTime: string }[]) {
    const duration = doctor.slotDurationMinutes;
    const buffer = doctor.bufferMinutes || 0;
    if (!duration || duration <= 0) throw new BadRequestException('Invalid slot duration configured');

    const existingBookings = await this.appointmentRepo.find({
      where: { doctor: { id: doctor.id }, apptDate: date, schedulingType: SchedulingType.STREAM },
    });
    const bookedTimes = new Set(existingBookings.map((a) => a.startTime));

    const slots: { startTime: string; endTime: string; isAvailable: boolean; isPast: boolean }[] = [];
    for (const window of windows) {
      let cursor = toMinutes(window.startTime);
      const end = toMinutes(window.endTime);
      while (cursor + duration <= end) {
        const slotStart = toTimeStr(cursor);
        const slotEnd = toTimeStr(cursor + duration);
        slots.push({
          startTime: slotStart,
          endTime: slotEnd,
          isAvailable: !bookedTimes.has(slotStart) && !this.isPast(date, slotStart),
          isPast: this.isPast(date, slotStart),
        });
        cursor += duration + buffer;
      }
    }
    return { date, schedulingType: SchedulingType.STREAM, slots };
  }

  private async findWaveBookings(doctorId: number, date: string) {
    return this.appointmentRepo
      .createQueryBuilder('a')
      .where('a.doctorId = :doctorId', { doctorId })
      .andWhere('a.apptDate = :date', { date })
      .andWhere('a.schedulingType = :type', { type: SchedulingType.WAVE })
      .getMany();
  }

  private async findWaveBookingsForWindow(
    doctorId: number,
    date: string,
    windowStart: string,
    windowEnd: string,
    excludeAppointmentId?: number,
  ) {
    const qb = this.appointmentRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.patient', 'patient')
      .where('a.doctorId = :doctorId', { doctorId })
      .andWhere('a.apptDate = :date', { date })
      .andWhere('a.startTime = :windowStart', { windowStart })
      .andWhere('a.endTime = :windowEnd', { windowEnd })
      .andWhere('a.status = :status', { status: AppointmentStatus.BOOKED });

    if (excludeAppointmentId) {
      qb.andWhere('a.id != :excludeId', { excludeId: excludeAppointmentId });
    }
    return qb.getMany();
  }

  async rescheduleAppointment(userId: number, appointmentId: number, dto: RescheduleAppointmentDto) {
    const appointment = await this.appointmentRepo.findOne({
      where: { id: appointmentId },
      relations: { patient: true, doctor: true },
    });
    if (!appointment) throw new NotFoundException('Appointment not found');

    const patient = await this.patientRepo.findOne({ where: { user: { id: userId }, relation: 'Self' } });
    if (!patient) throw new NotFoundException('Patient profile not found');

    if (appointment.patient.id !== patient.id) {
      throw new ForbiddenException('You are not the owner of this appointment');
    }
    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new BadRequestException('Cannot reschedule a cancelled appointment');
    }

    const oldDateTime = new Date(`${appointment.apptDate}T${appointment.startTime}:00`);
    if (oldDateTime.getTime() < Date.now()) {
      throw new BadRequestException('Cannot reschedule a past appointment');
    }
    if (this.isPast(dto.date, dto.startTime)) {
      throw new BadRequestException('Cannot reschedule to a past date/time');
    }

    const doctor = await this.doctorRepo.findOne({ where: { id: appointment.doctor.id } });
    if (!doctor) throw new NotFoundException('Doctor not found');

    const availability = await this.availabilityService.getAvailabilityForDateByDoctorId(doctor.id, dto.date);
    const windows = availability.slots as { startTime: string; endTime: string }[];

    if (doctor.schedulingType === SchedulingType.STREAM) {
      const duration = doctor.slotDurationMinutes;
      if (!duration) throw new BadRequestException('Invalid slot duration configured');
      const newEndTime = toTimeStr(toMinutes(dto.startTime) + duration);

      const withinWindow = windows.some((w) => dto.startTime >= w.startTime && newEndTime <= w.endTime);
      if (!withinWindow) throw new BadRequestException('Selected time is outside doctor availability');

      const conflict = await this.appointmentRepo
        .createQueryBuilder('a')
        .where('a.doctorId = :doctorId', { doctorId: doctor.id })
        .andWhere('a.apptDate = :date', { date: dto.date })
        .andWhere('a.startTime = :startTime', { startTime: dto.startTime })
        .andWhere('a.id != :id', { id: appointment.id })
        .andWhere('a.status = :status', { status: AppointmentStatus.BOOKED })
        .getOne();
      if (conflict) throw new ConflictException('This slot is already booked');

      const duplicate = await this.appointmentRepo
        .createQueryBuilder('a')
        .where('a.patientId = :patientId', { patientId: patient.id })
        .andWhere('a.apptDate = :date', { date: dto.date })
        .andWhere('a.startTime = :startTime', { startTime: dto.startTime })
        .andWhere('a.id != :id', { id: appointment.id })
        .andWhere('a.status = :status', { status: AppointmentStatus.BOOKED })
        .getOne();
      if (duplicate) throw new ConflictException('You already have an appointment at this time');

      appointment.apptDate = dto.date;
      appointment.startTime = dto.startTime;
      appointment.endTime = newEndTime;
    } else {
      if (!dto.endTime) throw new BadRequestException('endTime is required to identify the wave window');
      const maxCapacity = doctor.maxCapacityPerWindow;
      if (!maxCapacity) throw new BadRequestException('Invalid capacity configured');

      const validWindow = windows.some((w) => w.startTime === dto.startTime && w.endTime === dto.endTime);
      if (!validWindow) throw new BadRequestException('Selected window is not a valid availability window');

      const existingInWindow = await this.findWaveBookingsForWindow(
        doctor.id, dto.date, dto.startTime, dto.endTime, appointment.id,
      );
      if (existingInWindow.length >= maxCapacity) {
        throw new ConflictException('This wave is full');
      }
      const duplicate = existingInWindow.find((a) => a.patient.id === patient.id);
      if (duplicate) throw new ConflictException('You already have an appointment in this window');

      appointment.apptDate = dto.date;
      appointment.startTime = dto.startTime;
      appointment.endTime = dto.endTime;
      appointment.tokenNumber = existingInWindow.length + 1;
    }

    return this.appointmentRepo.save(appointment);
  }

  private async generateWaveWindows(doctor: Doctor, date: string, windows: { startTime: string; endTime: string }[]) {
    const maxCapacity = doctor.maxCapacityPerWindow;
    if (!maxCapacity || maxCapacity <= 0) throw new BadRequestException('Invalid capacity configured');

    const existingBookings = await this.findWaveBookings(doctor.id, date);

    const result = windows.map((w) => {
      const bookedCount = existingBookings.filter(
        (a) => a.startTime === w.startTime && a.endTime === w.endTime,
      ).length;
      return {
        windowStartTime: w.startTime,
        windowEndTime: w.endTime,
        maxCapacity,
        booked: bookedCount,
        available: maxCapacity - bookedCount,
        isFull: bookedCount >= maxCapacity,
      };
    });
    return { date, schedulingType: SchedulingType.WAVE, windows: result };
  }

  async bookStream(userId: number, doctorId: number, dto: BookStreamAppointmentDto) {
    const doctor = await this.doctorRepo.findOne({ where: { id: doctorId } });
    if (!doctor) throw new NotFoundException('Doctor not found');
    if (doctor.schedulingType !== SchedulingType.STREAM) {
      throw new BadRequestException('This doctor is not using STREAM scheduling');
    }
    if (this.isPast(dto.date, dto.startTime)) {
      throw new BadRequestException('Cannot book a slot in the past');
    }

    const patient = await this.patientRepo.findOne({ where: { user: { id: userId }, relation: 'Self' } });
    if (!patient) throw new NotFoundException('Patient profile not found');

    const duration = doctor.slotDurationMinutes;
    const endTime = toTimeStr(toMinutes(dto.startTime) + duration);

    const conflict = await this.appointmentRepo.findOne({
      where: { doctor: { id: doctor.id }, apptDate: dto.date, startTime: dto.startTime },
    });
    if (conflict) throw new ConflictException('This slot is already booked');

    const duplicate = await this.appointmentRepo.findOne({
      where: { doctor: { id: doctor.id }, patient: { id: patient.id }, apptDate: dto.date, startTime: dto.startTime },
    });
    if (duplicate) throw new ConflictException('You have already booked this slot');

    const appointment = this.appointmentRepo.create({
      doctor: { id: doctor.id } as any,
      patient: { id: patient.id } as any,
      apptDate: dto.date,
      startTime: dto.startTime,
      endTime,
      schedulingType: SchedulingType.STREAM,
      status: AppointmentStatus.BOOKED,   // ← changed from 'upcoming'
    });
    return this.appointmentRepo.save(appointment);
  }

  async bookWave(userId: number, doctorId: number, dto: BookWaveAppointmentDto) {
    const doctor = await this.doctorRepo.findOne({ where: { id: doctorId } });
    if (!doctor) throw new NotFoundException('Doctor not found');
    if (doctor.schedulingType !== SchedulingType.WAVE) {
      throw new BadRequestException('This doctor is not using WAVE scheduling');
    }
    if (this.isPast(dto.date, dto.windowStartTime)) {
      throw new BadRequestException('Cannot book a window in the past');
    }

    const patient = await this.patientRepo.findOne({ where: { user: { id: userId }, relation: 'Self' } });
    if (!patient) throw new NotFoundException('Patient profile not found');

    const duplicate = await this.appointmentRepo.findOne({
      where: {
        doctor: { id: doctor.id },
        patient: { id: patient.id },
        apptDate: dto.date,
        startTime: dto.windowStartTime,
        endTime: dto.windowEndTime,
      },
    });
    if (duplicate) throw new ConflictException('You have already booked this wave');

    const existingInWindow = await this.appointmentRepo.find({
      where: {
        doctor: { id: doctor.id },
        apptDate: dto.date,
        startTime: dto.windowStartTime,
        endTime: dto.windowEndTime,
      },
    });

    if (existingInWindow.length >= doctor.maxCapacityPerWindow) {
      throw new ConflictException('This wave is full');
    }

    const tokenNumber = existingInWindow.length + 1;

    const appointment = this.appointmentRepo.create({
      doctor: { id: doctor.id } as any,
      patient: { id: patient.id } as any,
      apptDate: dto.date,
      startTime: dto.windowStartTime,
      endTime: dto.windowEndTime,
      schedulingType: SchedulingType.WAVE,
      tokenNumber,
      status: AppointmentStatus.BOOKED,   // ← changed from 'upcoming'
    });
    return this.appointmentRepo.save(appointment);
  }
}
