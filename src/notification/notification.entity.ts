import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, Index } from 'typeorm';
import { Patient } from '../patient/patient.entity';
import { Appointment } from '../appointment/appointment.entity';
import { NotificationType } from './enums/notification-type.enum';

@Entity('notifications')
@Index(['patient', 'createdAt']) // supports "latest first" list queries scoped to a patient
export class Notification {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Patient, { onDelete: 'CASCADE' })
  patient!: Patient;

  // Nullable + SET NULL: appointments are soft-cancelled in this system, never
  // hard-deleted, so this should stay populated in practice. Nullable is a
  // safety net so historical notifications never become unreadable if that
  // ever changes.
  @ManyToOne(() => Appointment, { nullable: true, onDelete: 'SET NULL' })
  appointment!: Appointment | null;

  @Column({ type: 'enum', enum: NotificationType })
  type!: NotificationType;

  @Column()
  title!: string;

  @Column()
  message!: string;

  @Column({ default: false })
  isRead!: boolean;

  @CreateDateColumn()
  createdAt!: Date;
}
