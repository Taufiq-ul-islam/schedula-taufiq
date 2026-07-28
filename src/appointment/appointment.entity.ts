import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Doctor } from '../doctor/doctor.entity';
import { Patient } from '../patient/patient.entity';
import { SchedulingType } from '../doctor/enums/scheduling-type.enum';

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

  @Column({ default: 'upcoming' })
  status!: string;

  @Column({ nullable: true })
  reason!: string;

  @Column({ nullable: true })
  notes!: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @ManyToOne(() => Doctor, (doctor) => doctor.appointments)
  doctor!: Doctor;

  @ManyToOne(() => Patient, (patient) => patient.appointments)
  patient!: Patient;
}
