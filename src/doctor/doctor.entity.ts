import { Entity, PrimaryGeneratedColumn, Column, OneToMany, OneToOne, JoinColumn } from 'typeorm';
import { Appointment } from '../appointment/appointment.entity';
import { Slot } from './slot.entity';
import { User } from '../user/user.entity';

@Entity()
export class Doctor {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column()
  specialization!: string;

  @Column()
  experienceYears!: number;

  @Column()
  qualification!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  consultationFee!: number;

  @Column({ nullable: true })
  consultationHours!: string; // e.g. "Mon-Fri 10AM-1PM, Sat 2PM-5PM"

  @Column({ type: 'text', nullable: true })
  bio!: string;

  @OneToMany(() => Appointment, (appointment) => appointment.doctor)
  appointments!: Appointment[];

  @OneToMany(() => Slot, (slot) => slot.doctor)
  slots!: Slot[];

  @OneToOne(() => User, (user) => user.doctorProfile)
  @JoinColumn()
  user!: User;
}
