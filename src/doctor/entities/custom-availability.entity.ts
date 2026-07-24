import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Doctor } from '../doctor.entity';

@Entity()
export class CustomAvailability {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'date' })
  date!: string;

  @Column({ type: 'time' })
  startTime!: string;

  @Column({ type: 'time' })
  endTime!: string;

  @ManyToOne(() => Doctor, (doctor) => doctor.customAvailability)
  doctor!: Doctor;
}
