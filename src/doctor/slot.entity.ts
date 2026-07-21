import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { Doctor } from './doctor.entity';
import { Appointment } from '../appointment/appointment.entity';

@Entity()
export class Slot {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'date' })
  slotDate!: string;

  @Column({ type: 'time' })
  startTime!: string;

  @Column({ type: 'time' })
  endTime!: string;

  @Column({ default: true })
  isAvailable!: boolean;

  @ManyToOne(() => Doctor, (doctor) => doctor.slots)
  doctor!: Doctor;

  @OneToMany(() => Appointment, (appointment) => appointment.slot)
  appointments!: Appointment[];
}
