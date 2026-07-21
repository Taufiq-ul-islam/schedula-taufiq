import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Doctor } from '../doctor/doctor.entity';
import { Patient } from '../patient/patient.entity';
import { Slot } from '../doctor/slot.entity';

@Entity()
export class Appointment {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
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

  @ManyToOne(() => Slot, (slot) => slot.appointments)
  slot!: Slot;
}
