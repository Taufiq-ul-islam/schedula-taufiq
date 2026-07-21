import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { User } from '../user/user.entity';
import { Appointment } from '../appointment/appointment.entity';

@Entity()
export class Patient {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column()
  age!: number;

  @Column()
  sex!: string;

  @Column({ type: 'float' })
  weight!: number;

  @Column()
  relation!: string;

  @Column({ nullable: true })
  complaint!: string;

  @ManyToOne(() => User, (user) => user.patients)
  user!: User;

  @OneToMany(() => Appointment, (appointment) => appointment.patient)
  appointments!: Appointment[];
}
