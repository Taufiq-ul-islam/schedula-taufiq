import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Notification } from './notification.entity';
import { NotificationType } from './enums/notification-type.enum';
import { Patient } from '../patient/patient.entity';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger('NotificationService');

  constructor(
    @InjectRepository(Notification) private notificationRepo: Repository<Notification>,
    @InjectRepository(Patient) private patientRepo: Repository<Patient>,
  ) {}

  // ---------- formatting helpers (produce "25 June" / "10:00 AM" style text) ----------

  private formatDate(dateStr: string): string {
    const d = new Date(`${dateStr}T00:00:00Z`);
    const day = d.getUTCDate();
    const month = d.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
    return `${day} ${month}`;
  }

  private formatTime(timeStr: string): string {
    const [hStr, mStr] = timeStr.split(':');
    let h = parseInt(hStr, 10);
    const m = mStr.padStart(2, '0');
    const period = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    return `${h}:${m} ${period}`;
  }

  // ---------- core creation, duplicate-safe and transaction-safe ----------

  /**
   * Creates a notification if an identical one (same patient, appointment,
   * type, and message) doesn't already exist — this is the duplicate guard.
   * Fixed-message events (booked/cancelled) naturally dedupe since the
   * message never changes for a given appointment; reschedule notifications
   * still fire fresh each time because the message includes the new
   * date/time, so only an exact repeat (e.g. an accidental double-call with
   * the same target slot) gets skipped.
   *
   * MUST be called with the manager of the caller's own transaction (booking
   * / cancel / reschedule), never a bare repo call — this wraps itself in a
   * SAVEPOINT so a notification failure rolls back only itself, never the
   * appointment operation it's attached to. Returns null on failure instead
   * of throwing, by design: notification delivery is best-effort and must
   * never block or invalidate the appointment action that triggered it.
   */
  async createIfNotDuplicate(
    manager: EntityManager,
    patientId: number,
    appointmentId: number | null,
    type: NotificationType,
    title: string,
    message: string,
  ): Promise<Notification | null> {
    await manager.query('SAVEPOINT notification_create');
    try {
      const existing = await manager
        .createQueryBuilder(Notification, 'n')
        .where('n.patientId = :patientId', { patientId })
        .andWhere('n.appointmentId = :appointmentId', { appointmentId })
        .andWhere('n.type = :type', { type })
        .andWhere('n.message = :message', { message })
        .getOne();

      if (existing) {
        await manager.query('RELEASE SAVEPOINT notification_create');
        return existing;
      }

      const notification = manager.create(Notification, {
        patient: { id: patientId } as any,
        appointment: appointmentId ? ({ id: appointmentId } as any) : null,
        type,
        title,
        message,
      });
      const saved = await manager.save(notification);
      await manager.query('RELEASE SAVEPOINT notification_create');
      return saved;
    } catch (err) {
      await manager.query('ROLLBACK TO SAVEPOINT notification_create');
      this.logger.warn(
        `Notification creation failed (patient ${patientId}, appointment ${appointmentId}, type ${type}): ${err.message}`,
      );
      return null;
    }
  }

  // ---------- event-specific convenience wrappers (message templating lives here, once) ----------

  async notifyAppointmentBooked(
    manager: EntityManager,
    params: { patientId: number; appointmentId: number; doctorName: string; apptDate: string; startTime: string },
  ): Promise<Notification | null> {
    const message = `Your appointment with Dr. ${params.doctorName} has been booked successfully for ${this.formatDate(
      params.apptDate,
    )} at ${this.formatTime(params.startTime)}.`;
    return this.createIfNotDuplicate(
      manager,
      params.patientId,
      params.appointmentId,
      NotificationType.APPOINTMENT_BOOKED,
      'Appointment Booked',
      message,
    );
  }

  async notifyAppointmentCancelled(
    manager: EntityManager,
    params: { patientId: number; appointmentId: number; apptDate: string; startTime: string },
  ): Promise<Notification | null> {
    const message = `Your appointment scheduled on ${this.formatDate(params.apptDate)} at ${this.formatTime(
      params.startTime,
    )} has been cancelled.`;
    return this.createIfNotDuplicate(
      manager,
      params.patientId,
      params.appointmentId,
      NotificationType.APPOINTMENT_CANCELLED,
      'Appointment Cancelled',
      message,
    );
  }

  async notifyAppointmentRescheduled(
    manager: EntityManager,
    params: { patientId: number; appointmentId: number; newApptDate: string; newStartTime: string },
  ): Promise<Notification | null> {
    const message = `Your appointment has been rescheduled to ${this.formatDate(
      params.newApptDate,
    )} at ${this.formatTime(params.newStartTime)}.`;
    return this.createIfNotDuplicate(
      manager,
      params.patientId,
      params.appointmentId,
      NotificationType.APPOINTMENT_RESCHEDULED,
      'Appointment Rescheduled',
      message,
    );
  }

  // ---------- read APIs ----------

  async getMyNotifications(userId: number) {
    const patient = await this.patientRepo.findOne({ where: { user: { id: userId }, relation: 'Self' } });
    if (!patient) throw new NotFoundException('Patient profile not found');

    return this.notificationRepo
      .createQueryBuilder('n')
      .where('n.patientId = :patientId', { patientId: patient.id })
      .orderBy('n.createdAt', 'DESC')
      .getMany();
  }

  async markAsRead(userId: number, notificationId: number) {
    const patient = await this.patientRepo.findOne({ where: { user: { id: userId }, relation: 'Self' } });
    if (!patient) throw new NotFoundException('Patient profile not found');

    const notification = await this.notificationRepo.findOne({
      where: { id: notificationId },
      relations: { patient: true },
    });
    if (!notification) throw new NotFoundException('Notification not found');
    if (notification.patient.id !== patient.id) {
      throw new ForbiddenException('You are not the owner of this notification');
    }

    notification.isRead = true;
    return this.notificationRepo.save(notification);
  }
}
