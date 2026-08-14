import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Doctor } from '../doctor/doctor.entity';
import { Patient } from '../patient/patient.entity';
import { SchedulingType } from '../doctor/enums/scheduling-type.enum';
import { AppointmentStatus } from './enums/appointment-status.enum';

@Entity()
export class Appointment {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'date' })
  apptDate!: string;

  @Column({ type: 'time' })
  startTime!: string;

  @Column({ type: 'time' })
  endTime!: string;

  @Column({ type: 'enum', enum: SchedulingType })
  schedulingType!: SchedulingType;

  @Column({ nullable: true })
  tokenNumber!: number; // WAVE only

  @Column({ type: 'enum', enum: AppointmentStatus, default: AppointmentStatus.BOOKED })
  status!: AppointmentStatus;

  @Column({ nullable: true })
  reason!: string;

  @Column({ nullable: true })
  notes!: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @Column({ type: 'date', nullable: true })
  originalApptDate !: string | null;

  @Column({ type: 'time', nullable: true })
  originalStartTime !: string | null;

  @Column({ type: 'time', nullable: true })
  originalEndTime !: string | null;

  @Column({ type: 'int', nullable: true })
  originalTokenNumber !: number | null;

  @Column({ type: 'boolean', default: false })
  autoRescheduled !: boolean;

  @Column({ nullable: true })
  cancelReason!: string;

  @Column({ default: false })
  notificationPending!: boolean;

  @ManyToOne(() => Doctor, (doctor) => doctor.appointments)
  doctor!: Doctor;

  @ManyToOne(() => Patient, (patient) => patient.appointments)
  patient!: Patient;
}
