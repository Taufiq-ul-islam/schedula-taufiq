import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { Appointment } from './appointment.entity';
import { AppointmentStatus } from './enums/appointment-status.enum';
import { NotificationService } from '../notification/notification.service';

// How far ahead of an appointment a reminder should start being offered.
// Kept as a named constant rather than config for now — bump this (and the
// cron interval below) if the business wants a shorter/longer heads-up.
const REMINDER_WINDOW_HOURS = 24;

// Padding for the initial DB date-range query so the window never gets cut
// off by a day boundary — actual precision filtering happens in JS via
// isWithinReminderWindow, same pattern as isPast()/cutoff checks elsewhere
// in this codebase (date+time arithmetic isn't reliable to do in raw SQL
// against separate date/time columns).
const REMINDER_QUERY_LOOKAHEAD_DAYS = Math.ceil(REMINDER_WINDOW_HOURS / 24) + 1;

@Injectable()
export class AppointmentReminderService {
  private readonly logger = new Logger('AppointmentReminderService');

  // Guards against overlapping runs if a sweep ever takes longer than the
  // cron interval (large appointment volume, slow DB, etc.) — without this,
  // two concurrent sweeps could both pass the duplicate check for the same
  // appointment before either one's insert commits.
  private isRunning = false;

  constructor(
    @InjectRepository(Appointment) private appointmentRepo: Repository<Appointment>,
    private notificationService: NotificationService,
  ) {}

  @Cron('0 */15 * * * *') // 15 min check
  async handleReminderSweep(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Previous reminder sweep still running — skipping this tick');
      return;
    }
    this.isRunning = true;
    try {
      await this.runReminderSweep();
    } catch (err) {
      this.logger.error(`Reminder sweep failed: ${err.message}`, err.stack);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Extracted from the @Cron handler so tests (and manual triggering, if
   * ever needed) can call this directly without waiting on the schedule.
   */
  async runReminderSweep(): Promise<{ remindersSent: number; skipped: number; scanned: number }> {
    const today = new Date().toISOString().slice(0, 10);
    const rangeEnd = this.addDays(today, REMINDER_QUERY_LOOKAHEAD_DAYS);

    // Cancelled appointments are excluded here via status = BOOKED.
    // "Completed" appointments have no explicit status in this schema —
    // they're excluded implicitly because isWithinReminderWindow() below
    // requires apptDateTime >= now, so anything already in the past never
    // qualifies regardless of status.
    const candidates = await this.appointmentRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.patient', 'patient')
      .leftJoinAndSelect('a.doctor', 'doctor')
      .where('a.status = :status', { status: AppointmentStatus.BOOKED })
      .andWhere('a.apptDate >= :today', { today })
      .andWhere('a.apptDate <= :rangeEnd', { rangeEnd })
      .getMany();

    let remindersSent = 0;
    let skipped = 0;

    for (const appt of candidates) {
      try {
        if (!appt.doctor || !appt.patient || !appt.apptDate || !appt.startTime || !appt.schedulingType) {
          this.logger.warn(`Skipping appointment ${appt.id} — incomplete data`);
          skipped++;
          continue;
        }

        if (!this.isWithinReminderWindow(appt.apptDate, appt.startTime)) continue;

        // One small transaction per appointment: keeps a failure on one
        // reminder from affecting any other candidate in the same sweep,
        // and gives notifyAppointmentReminder's own savepoint guard a
        // manager to work with (same pattern as booking/cancel/reschedule).
        const result = await this.appointmentRepo.manager.transaction((manager) =>
          this.notificationService.notifyAppointmentReminder(manager, {
            patientId: appt.patient.id,
            appointmentId: appt.id,
            doctorName: appt.doctor.name,
            apptDate: appt.apptDate,
            startTime: appt.startTime,
            schedulingType: appt.schedulingType,
            tokenNumber: appt.tokenNumber ?? null,
          }),
        );

        if (result) remindersSent++;
      } catch (err) {
        this.logger.warn(`Reminder failed for appointment ${appt.id}: ${err.message}`);
        skipped++;
      }
    }

    this.logger.log(
      `Reminder sweep complete: ${remindersSent} sent, ${skipped} skipped, ${candidates.length} scanned`,
    );
    return { remindersSent, skipped, scanned: candidates.length };
  }

  private isWithinReminderWindow(apptDate: string, startTime: string): boolean {
    const apptDateTime = new Date(`${apptDate}T${startTime}:00`).getTime();
    const now = Date.now();
    const windowMs = REMINDER_WINDOW_HOURS * 60 * 60 * 1000;
    return apptDateTime >= now && apptDateTime <= now + windowMs;
  }

  private addDays(dateStr: string, days: number): string {
    const d = new Date(`${dateStr}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }
}
