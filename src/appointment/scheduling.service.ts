import { Injectable, NotFoundException, BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Doctor } from '../doctor/doctor.entity';
import { SchedulingType } from '../doctor/enums/scheduling-type.enum';
import { Patient } from '../patient/patient.entity';
import { Appointment } from './appointment.entity';
import { AppointmentStatus } from './enums/appointment-status.enum';
import { CancelReason } from './enums/cancel-reason.enum';
import { AvailabilityService } from '../doctor/availability.service';
import { BookStreamAppointmentDto } from './dto/book-stream-appointment.dto';
import { BookWaveAppointmentDto } from './dto/book-wave-appointment.dto';
import { BookAppointmentDto } from './dto/book-appointment.dto';
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

const RESCHEDULE_CANCEL_CUTOFF_MINUTES = 30;

@Injectable()
export class SchedulingService {
  constructor(
    @InjectRepository(Doctor) private doctorRepo: Repository<Doctor>,
    @InjectRepository(Patient) private patientRepo: Repository<Patient>,
    @InjectRepository(Appointment) private appointmentRepo: Repository<Appointment>,
    private availabilityService: AvailabilityService,
  ) {}

  // ---------- shared helpers ----------

  private isPast(date: string, time: string): boolean {
    const candidate = new Date(`${date}T${time}:00`);
    return candidate.getTime() < Date.now();
  }

  private ensureNotWithinCutoff(date: string, time: string, action: string) {
    const apptDateTime = new Date(`${date}T${time}:00`);
    const diffMinutes = (apptDateTime.getTime() - Date.now()) / 60000;
    if (diffMinutes < 0) {
      throw new BadRequestException(`Cannot ${action} a past appointment`);
    }
    if (diffMinutes < RESCHEDULE_CANCEL_CUTOFF_MINUTES) {
      throw new BadRequestException(
        `Cannot ${action} within ${RESCHEDULE_CANCEL_CUTOFF_MINUTES} minutes of the appointment time`,
      );
    }
  }

  private timesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
    return startA < endB && startB < endA;
  }

  private computeEffectiveCapacity(doctor: Doctor, startTime: string, endTime: string): number {
    if (!doctor.minMinutesPerPatient) return doctor.maxCapacityPerWindow;
    const duration = toMinutes(endTime) - toMinutes(startTime);
    return Math.min(doctor.maxCapacityPerWindow, Math.floor(duration / doctor.minMinutesPerPatient));
  }

  private addDays(dateStr: string, days: number): string {
    const d = new Date(`${dateStr}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }

  private async findNextAvailable(doctorId: number, fromDate: string, lookaheadDays = 7) {
    const doctor = await this.doctorRepo.findOne({ where: { id: doctorId } });
    if (!doctor) return null;

    let date = fromDate;
    for (let i = 0; i < lookaheadDays; i++) {
      try {
        const result: any = await this.getAvailableSlots(doctorId, date);
        if (doctor.schedulingType === SchedulingType.STREAM) {
          const candidate = result.slots.find((s: any) => s.isAvailable);
          if (candidate) return { date, startTime: candidate.startTime, endTime: candidate.endTime };
        } else {
          const candidate = result.windows.find((w: any) => !w.isFull);
          if (candidate) return { date, windowStartTime: candidate.windowStartTime, windowEndTime: candidate.windowEndTime };
        }
      } catch {
        // no availability at all that day — keep scanning forward
      }
      date = this.addDays(date, 1);
    }
    return null;
  }

  // ---------- slot / window generation ----------

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

    const existingBookings = await this.appointmentRepo
      .createQueryBuilder('a')
      .where('a.doctorId = :doctorId', { doctorId: doctor.id })
      .andWhere('a.apptDate = :date', { date })
      .andWhere('a.schedulingType = :type', { type: SchedulingType.STREAM })
      .andWhere('a.status = :status', { status: AppointmentStatus.BOOKED })
      .getMany();
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

  private async generateWaveWindows(doctor: Doctor, date: string, windows: { startTime: string; endTime: string }[]) {
    if (!doctor.maxCapacityPerWindow || doctor.maxCapacityPerWindow <= 0) {
      throw new BadRequestException('Invalid capacity configured');
    }

    const existingBookings = await this.appointmentRepo
      .createQueryBuilder('a')
      .where('a.doctorId = :doctorId', { doctorId: doctor.id })
      .andWhere('a.apptDate = :date', { date })
      .andWhere('a.schedulingType = :type', { type: SchedulingType.WAVE })
      .andWhere('a.status = :status', { status: AppointmentStatus.BOOKED })
      .getMany();

    const result = windows.map((w) => {
      const effectiveCapacity = this.computeEffectiveCapacity(doctor, w.startTime, w.endTime);
      const bookedCount = existingBookings.filter(
        (a) => a.startTime === w.startTime && a.endTime === w.endTime,
      ).length;
      return {
        windowStartTime: w.startTime,
        windowEndTime: w.endTime,
        maxCapacity: effectiveCapacity,
        booked: bookedCount,
        available: effectiveCapacity - bookedCount,
        isFull: bookedCount >= effectiveCapacity,
      };
    });
    return { date, schedulingType: SchedulingType.WAVE, windows: result };
  }

  // ---------- booking ----------

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

    return this.appointmentRepo.manager.transaction(async (manager) => {
      const conflict = await manager
        .createQueryBuilder(Appointment, 'a')
        .setLock('pessimistic_write')
        .where('a.doctorId = :doctorId', { doctorId: doctor.id })
        .andWhere('a.apptDate = :date', { date: dto.date })
        .andWhere('a.startTime = :startTime', { startTime: dto.startTime })
        .andWhere('a.status = :status', { status: AppointmentStatus.BOOKED })
        .getOne();

      if (conflict) {
        const suggestion = await this.findNextAvailable(doctorId, dto.date);
        throw new ConflictException({ message: 'This slot is already booked', suggestedNextAvailable: suggestion });
      }

      const duplicate = await manager
        .createQueryBuilder(Appointment, 'a')
        .where('a.doctorId = :doctorId', { doctorId: doctor.id })
        .andWhere('a.patientId = :patientId', { patientId: patient.id })
        .andWhere('a.apptDate = :date', { date: dto.date })
        .andWhere('a.startTime = :startTime', { startTime: dto.startTime })
        .andWhere('a.status = :status', { status: AppointmentStatus.BOOKED })
        .getOne();
      if (duplicate) throw new ConflictException('You have already booked this slot');

      const appointment = manager.create(Appointment, {
        doctor: { id: doctor.id } as any,
        patient: { id: patient.id } as any,
        apptDate: dto.date,
        startTime: dto.startTime,
        endTime,
        schedulingType: SchedulingType.STREAM,
        status: AppointmentStatus.BOOKED,
      });
      return manager.save(appointment);
    });
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

    return this.appointmentRepo.manager.transaction(async (manager) => {
      const existingInWindow = await manager
        .createQueryBuilder(Appointment, 'a')
        .setLock('pessimistic_write')
        .where('a.doctorId = :doctorId', { doctorId: doctor.id })
        .andWhere('a.apptDate = :date', { date: dto.date })
        .andWhere('a.startTime = :startTime', { startTime: dto.windowStartTime })
        .andWhere('a.endTime = :endTime', { endTime: dto.windowEndTime })
        .andWhere('a.status = :status', { status: AppointmentStatus.BOOKED })
        .leftJoinAndSelect('a.patient', 'patient')
        .getMany();

      const duplicate = existingInWindow.find((a) => a.patient?.id === patient.id);
      if (duplicate) throw new ConflictException('You have already booked this wave');

      const effectiveCapacity = this.computeEffectiveCapacity(doctor, dto.windowStartTime, dto.windowEndTime);
      if (existingInWindow.length >= effectiveCapacity) {
        const suggestion = await this.findNextAvailable(doctorId, dto.date);
        throw new ConflictException({ message: 'This wave is full', suggestedNextAvailable: suggestion });
      }

      const tokenNumber = existingInWindow.length + 1;
      const appointment = manager.create(Appointment, {
        doctor: { id: doctor.id } as any,
        patient: { id: patient.id } as any,
        apptDate: dto.date,
        startTime: dto.windowStartTime,
        endTime: dto.windowEndTime,
        schedulingType: SchedulingType.WAVE,
        tokenNumber,
        status: AppointmentStatus.BOOKED,
      });
      return manager.save(appointment);
    });
  }

  // ---------- reschedule ----------

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

    this.ensureNotWithinCutoff(appointment.apptDate, appointment.startTime, 'reschedule');

    if (this.isPast(dto.date, dto.startTime)) {
      throw new BadRequestException('Cannot reschedule to a past date/time');
    }

    const sameSlot =
      dto.date === appointment.apptDate &&
      dto.startTime === appointment.startTime &&
      (!dto.endTime || dto.endTime === appointment.endTime);
    if (sameSlot) {
      throw new BadRequestException('New time is the same as the current appointment time');
    }

    const doctor = await this.doctorRepo.findOne({ where: { id: appointment.doctor.id } });
    if (!doctor) throw new NotFoundException('Doctor not found');
    if (!doctor.schedulingType) throw new BadRequestException('Invalid scheduling type configured for this doctor');

    const availability = await this.availabilityService.getAvailabilityForDateByDoctorId(doctor.id, dto.date);
    const windows = availability.slots as { startTime: string; endTime: string }[];

    return this.appointmentRepo.manager.transaction(async (manager) => {
      if (doctor.schedulingType === SchedulingType.STREAM) {
        const duration = doctor.slotDurationMinutes;
        if (!duration) throw new BadRequestException('Invalid slot duration configured');
        const newEndTime = toTimeStr(toMinutes(dto.startTime) + duration);

        const withinWindow = windows.some((w) => dto.startTime >= w.startTime && newEndTime <= w.endTime);
        if (!withinWindow) throw new BadRequestException('Selected time is outside doctor availability');

        const conflict = await manager
          .createQueryBuilder(Appointment, 'a')
          .setLock('pessimistic_write')
          .where('a.doctorId = :doctorId', { doctorId: doctor.id })
          .andWhere('a.apptDate = :date', { date: dto.date })
          .andWhere('a.startTime = :startTime', { startTime: dto.startTime })
          .andWhere('a.id != :id', { id: appointment.id })
          .andWhere('a.status = :status', { status: AppointmentStatus.BOOKED })
          .getOne();
        if (conflict) {
          const suggestion = await this.findNextAvailable(doctor.id, dto.date);
          throw new ConflictException({ message: 'This slot is already booked', suggestedNextAvailable: suggestion });
        }

        const duplicate = await manager
          .createQueryBuilder(Appointment, 'a')
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
        return manager.save(appointment);
      } else {
        if (!dto.endTime) throw new BadRequestException('endTime is required to identify the wave window');

        const validWindow = windows.some((w) => w.startTime === dto.startTime && w.endTime === dto.endTime);
        if (!validWindow) throw new BadRequestException('Selected window is not a valid availability window');

        const existingInWindow = await manager
          .createQueryBuilder(Appointment, 'a')
          .setLock('pessimistic_write')
          .where('a.doctorId = :doctorId', { doctorId: doctor.id })
          .andWhere('a.apptDate = :date', { date: dto.date })
          .andWhere('a.startTime = :startTime', { startTime: dto.startTime })
          .andWhere('a.endTime = :endTime', { endTime: dto.endTime })
          .andWhere('a.id != :id', { id: appointment.id })
          .andWhere('a.status = :status', { status: AppointmentStatus.BOOKED })
          .leftJoinAndSelect('a.patient', 'patient')
          .getMany();

        const duplicate = existingInWindow.find((a) => a.patient?.id === patient.id);
        if (duplicate) throw new ConflictException('You already have an appointment in this window');

        const effectiveCapacity = this.computeEffectiveCapacity(doctor, dto.startTime, dto.endTime);
        if (existingInWindow.length >= effectiveCapacity) {
          const suggestion = await this.findNextAvailable(doctor.id, dto.date);
          throw new ConflictException({ message: 'This wave is full', suggestedNextAvailable: suggestion });
        }

        appointment.apptDate = dto.date;
        appointment.startTime = dto.startTime;
        appointment.endTime = dto.endTime;
        appointment.tokenNumber = existingInWindow.length + 1;
        return manager.save(appointment);
      }
    });
  }

  // ---------- availability-change reconciliation ----------

  async reconcileAppointmentsForDate(doctorId: number, date: string) {
    const doctor = await this.doctorRepo.findOne({ where: { id: doctorId } });
    if (!doctor) throw new NotFoundException('Doctor not found');

    let windows: { startTime: string; endTime: string }[] = [];
    try {
      const availability = await this.availabilityService.getAvailabilityForDateByDoctorId(doctorId, date);
      windows = availability.slots as any;
    } catch {
      windows = []; // doctor has no availability at all on this date now
    }

    const bookedAppointments = await this.appointmentRepo
      .createQueryBuilder('a')
      .where('a.doctorId = :doctorId', { doctorId })
      .andWhere('a.apptDate = :date', { date })
      .andWhere('a.status = :status', { status: AppointmentStatus.BOOKED })
      .getMany();

    const cancelledIds: number[] = [];

    const cancelAppt = async (appt: Appointment) => {
      appt.status = AppointmentStatus.CANCELLED;
      appt.cancelReason = CancelReason.DOCTOR_AVAILABILITY_CHANGED;
      appt.notificationPending = true; // future notification worker picks these up
      await this.appointmentRepo.save(appt);
      cancelledIds.push(appt.id);
    };

    if (doctor.schedulingType === SchedulingType.STREAM) {
      for (const appt of bookedAppointments) {
        const fits = windows.some((w) => appt.startTime >= w.startTime && appt.endTime <= w.endTime);
        if (!fits) await cancelAppt(appt);
      }
    } else {
      const groups = new Map<string, Appointment[]>();
      for (const appt of bookedAppointments) {
        const key = `${appt.startTime}-${appt.endTime}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(appt);
      }

      for (const [key, group] of groups) {
        const [oldStart, oldEnd] = key.split('-');

        // Match by overlap, not exact equality — lets a resized window carry
        // its bookings forward instead of being treated as a brand new window.
        const matchedWindow = windows.find((w) => this.timesOverlap(w.startTime, w.endTime, oldStart, oldEnd));

        if (!matchedWindow) {
          for (const appt of group) await cancelAppt(appt);
          continue;
        }

        const effectiveCapacity = this.computeEffectiveCapacity(doctor, matchedWindow.startTime, matchedWindow.endTime);

        const sorted = [...group].sort((a, b) => (b.tokenNumber ?? 0) - (a.tokenNumber ?? 0));
        const excessCount = Math.max(0, group.length - effectiveCapacity);
        const excess = sorted.slice(0, excessCount);
        const kept = sorted.slice(excessCount);

        for (const appt of excess) await cancelAppt(appt);

        for (const appt of kept) {
          appt.startTime = matchedWindow.startTime;
          appt.endTime = matchedWindow.endTime;
          await this.appointmentRepo.save(appt);
        }
      }
    }

    return { cancelledAppointmentIds: cancelledIds };
  }

  async reconcileAllFutureDatesForDoctor(doctorId: number) {
    const today = new Date().toISOString().slice(0, 10);

    const futureDates = await this.appointmentRepo
      .createQueryBuilder('a')
      .select('DISTINCT a.apptDate', 'apptDate')
      .where('a.doctorId = :doctorId', { doctorId })
      .andWhere('a.status = :status', { status: AppointmentStatus.BOOKED })
      .andWhere('a.apptDate >= :today', { today })
      .getRawMany();

    const allCancelledIds: number[] = [];
    for (const row of futureDates) {
      const result = await this.reconcileAppointmentsForDate(doctorId, row.apptDate);
      allCancelledIds.push(...result.cancelledAppointmentIds);
    }
    return { cancelledAppointmentIds: allCancelledIds, datesChecked: futureDates.length };
  }
}
