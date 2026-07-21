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

  @OneToMany(() => Appointment, (appointment) => appointment.doctor)
  appointments!: Appointment[];

  @OneToMany(() => Slot, (slot) => slot.doctor)
  slots!: Slot[];

  @OneToOne(() => User, (user) => user.doctorProfile)
  @JoinColumn()
  user!: User;
}
