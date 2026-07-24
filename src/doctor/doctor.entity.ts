import { Entity, PrimaryGeneratedColumn, Column, OneToMany, OneToOne, JoinColumn } from 'typeorm';
import { Appointment } from '../appointment/appointment.entity';
import { Slot } from './slot.entity';
import { User } from '../user/user.entity';
import { RecurringAvailability } from './entities/recurring-availability.entity';
import { CustomAvailability } from './entities/custom-availability.entity';

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
  consultationHours!: string;

  @Column({ type: 'text', nullable: true })
  bio!: string;

  @OneToMany(() => Appointment, (appointment) => appointment.doctor)
  appointments!: Appointment[];

  @OneToMany(() => Slot, (slot) => slot.doctor)
  slots!: Slot[];

  @OneToMany(() => RecurringAvailability, (r) => r.doctor)
  recurringAvailability!: RecurringAvailability[];

  @OneToMany(() => CustomAvailability, (c) => c.doctor)
  customAvailability!: CustomAvailability[];

  @OneToOne(() => User, (user) => user.doctorProfile)
  @JoinColumn()
  user!: User;
}
